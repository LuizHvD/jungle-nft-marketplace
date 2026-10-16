import { http } from 'msw'
import {
  orderCreateSchema,
  orderSchema,
  type OrderResponse,
} from '../../contracts/orders.ts'
import { aggregateEditionLines } from '../../domain/edition-lines.ts'
import { keepTerminalStatus } from '../../domain/events.ts'
import { hashIdempotencyPayload } from '../../domain/idempotency.ts'
import { parseDecimalToWei } from '../../domain/money.ts'
import { bearerToken, requireUser } from '../actor.ts'
import { findCart, findEdition, type Order } from '../db.ts'
import { ApiError } from '../errors.ts'
import { guard, withoutDrop } from '../failures.ts'
import { hangUntilAbort, jsonData } from '../http.ts'
import { parseBody, readJson } from '../parse.ts'
import { emitOrderUpdated } from '../sockets.ts'
import { withState } from '../store.ts'

function presentOrder(order: Order): OrderResponse {
  return orderSchema.parse({
    id: order.id,
    quoteId: order.quoteId,
    status: order.status,
    version: order.version,
    snapshot: order.snapshot,
  })
}

export const orderHandlers = [
  http.post(
    '/api/orders',
    guard(
      async ({ request }) => {
        const token = bearerToken(request)
        const idempotencyKey = request.headers.get('idempotency-key')?.trim()
        if (!idempotencyKey) {
          throw new ApiError(
            400,
            'VALIDATION',
            'Informe a chave de idempotência.',
            {
              'Idempotency-Key': 'Informe a chave.',
            },
          )
        }
        const body = parseBody(orderCreateSchema, await readJson(request))
        const payloadHash = await hashIdempotencyPayload(
          body.quoteId,
          body.expectedTotal,
        )
        const created = await withState((state) => {
          const userId = requireUser(state, token)
          const existing = state.idempotency.find(
            (record) =>
              record.actorId === userId && record.key === idempotencyKey,
          )
          if (existing) {
            if (existing.payloadHash !== payloadHash) {
              throw new ApiError(
                409,
                'IDEMPOTENCY_CONFLICT',
                'A chave já foi usada com outro payload.',
              )
            }
            const order = state.orders.find(
              (item) => item.id === existing.orderId && item.actorId === userId,
            )
            if (!order) {
              throw new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
            }
            return {
              state,
              result: {
                order: presentOrder(order),
                hang: false,
                userId,
                created: false,
              },
            }
          }

          const quote = state.quotes.find((item) => item.id === body.quoteId)
          if (!quote || quote.actorId !== userId) {
            throw new ApiError(404, 'NOT_FOUND', 'Cotação não encontrada.')
          }
          if (!quote.definitive) {
            throw new ApiError(
              409,
              'QUOTE_STALE',
              'A cotação preliminar não fecha pedido.',
            )
          }
          if (Date.parse(quote.expiresAt) <= Date.parse(state.clock)) {
            throw new ApiError(409, 'QUOTE_STALE', 'A cotação expirou.')
          }
          if (
            parseDecimalToWei(body.expectedTotal) !==
            parseDecimalToWei(quote.total)
          ) {
            throw new ApiError(
              409,
              'QUOTE_STALE',
              'O total não confere com a cotação.',
            )
          }
          if (quote.couponCode) {
            const coupon = state.coupons.find(
              (item) =>
                item.code.toLowerCase() === quote.couponCode?.toLowerCase(),
            )
            const expired =
              state.couponMode === 'expired' ||
              !coupon ||
              Date.parse(coupon.expiresAt) <= Date.parse(state.clock)
            if (state.couponMode === 'invalid' || !coupon) {
              throw new ApiError(422, 'COUPON_INVALID', 'Cupom inválido.')
            }
            if (expired) {
              throw new ApiError(422, 'COUPON_EXPIRED', 'Cupom expirado.')
            }
          }

          if (!quote.walletId || !quote.network) {
            throw new ApiError(422, 'VALIDATION', 'Informe carteira e rede.', {
              walletId: 'Informe a carteira.',
              network: 'Informe a rede.',
            })
          }
          const wallet = state.wallets.find(
            (item) => item.id === quote.walletId,
          )
          if (!wallet || wallet.userId !== userId) {
            throw new ApiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
          }
          const connected =
            wallet.connection.status === 'connected' &&
            wallet.connection.network === quote.network
          if (!connected) {
            throw new ApiError(
              422,
              'VALIDATION',
              'Conexão da carteira inválida.',
              {
                network: 'Conecte a carteira na rede escolhida.',
              },
            )
          }

          const lines = aggregateEditionLines(quote.items)
          for (const item of lines) {
            const found = findEdition(state, item.nftId, item.editionId)
            if (!found) {
              throw new ApiError(404, 'NOT_FOUND', 'Edição não encontrada.')
            }
            if (
              parseDecimalToWei(found.edition.price) !==
              parseDecimalToWei(item.unitPrice)
            ) {
              throw new ApiError(409, 'QUOTE_STALE', 'O preço mudou.')
            }
            if (item.quantity > found.edition.availableSupply) {
              throw new ApiError(409, 'SOLD_OUT', 'Estoque esgotado.')
            }
          }

          const status = keepTerminalStatus('pending', state.orderOutcome)
          if (status !== 'declined') {
            for (const item of lines) {
              const found = findEdition(state, item.nftId, item.editionId)
              if (!found || found.edition.availableSupply < item.quantity) {
                throw new ApiError(409, 'SOLD_OUT', 'Estoque esgotado.')
              }
              found.edition.availableSupply -= item.quantity
            }
          }
          if (status === 'confirmed') {
            const cart = findCart(state, userId)
            for (const item of lines) {
              const line = cart.items.find(
                (entry) =>
                  entry.nftId === item.nftId &&
                  entry.editionId === item.editionId,
              )
              if (!line) {
                continue
              }
              line.quantity -= item.quantity
            }
            cart.items = cart.items.filter((item) => item.quantity > 0)
          }

          const hadDrop = state.failure?.drop === true
          if (hadDrop && state.failure) {
            state.failure = withoutDrop(state.failure)
          }
          const order: Order = {
            id: crypto.randomUUID(),
            actorId: userId,
            quoteId: quote.id,
            status,
            version: 1,
            snapshot: {
              items: quote.items.map((item) => ({ ...item })),
              subtotal: quote.subtotal,
              discount: quote.discount,
              fee: quote.fee,
              total: quote.total,
              couponCode: quote.couponCode,
            },
          }
          state.orders.push(order)
          state.idempotency.push({
            actorId: userId,
            key: idempotencyKey,
            payloadHash,
            orderId: order.id,
          })
          return {
            state,
            result: {
              order: presentOrder(order),
              hang: hadDrop,
              userId,
              created: true,
            },
          }
        })

        if (created.created) {
          await emitOrderUpdated({
            id: created.order.id,
            actorId: created.userId,
            version: created.order.version,
            status: created.order.status,
          })
        }
        if (created.hang) {
          return hangUntilAbort(request)
        }
        return jsonData(orderSchema, created.order)
      },
      { deferDrop: true },
    ),
  ),
  http.get(
    '/api/orders/:id',
    guard(async ({ request, params }) => {
      const token = bearerToken(request)
      const orderId = String(params.id)
      const order = await withState((state) => {
        const userId = requireUser(state, token)
        const current = state.orders.find((item) => item.id === orderId)
        if (!current || current.actorId !== userId) {
          throw new ApiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
        }
        return { state, result: presentOrder(current) }
      })
      return jsonData(orderSchema, order)
    }),
  ),
]
