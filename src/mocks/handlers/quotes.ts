import { http } from 'msw'
import {
  quoteRequestSchema,
  quoteSchema,
  type QuoteResponse,
} from '../../contracts/quotes.ts'
import { aggregateEditionLines } from '../../domain/edition-lines.ts'
import { formatWei, parseDecimalToWei } from '../../domain/money.ts'
import { quoteTotals } from '../../domain/quote.ts'
import {
  bearerToken,
  guestActorId,
  requireActor,
  requireUser,
} from '../actor.ts'
import { findEdition, type DemoState, type Quote } from '../db.ts'
import { ApiError } from '../errors.ts'
import { guard } from '../failures.ts'
import { jsonData } from '../http.ts'
import { parseBody, readJson } from '../parse.ts'
import { withState } from '../store.ts'

const QUOTE_TTL_MS = 15 * 60 * 1000

function couponBasisPoints(state: DemoState, code: string | undefined): number {
  if (!code) {
    return 0
  }
  if (state.couponMode === 'invalid') {
    throw new ApiError(422, 'COUPON_INVALID', 'Cupom inválido.')
  }
  if (state.couponMode === 'expired') {
    throw new ApiError(422, 'COUPON_EXPIRED', 'Cupom expirado.')
  }
  const coupon = state.coupons.find(
    (item) => item.code.toLowerCase() === code.toLowerCase(),
  )
  if (!coupon) {
    throw new ApiError(422, 'COUPON_INVALID', 'Cupom inválido.')
  }
  if (Date.parse(coupon.expiresAt) <= Date.parse(state.clock)) {
    throw new ApiError(422, 'COUPON_EXPIRED', 'Cupom expirado.')
  }
  return coupon.basisPoints
}

function presentQuote(quote: Quote): QuoteResponse {
  return quoteSchema.parse({
    quoteId: quote.id,
    version: quote.version,
    items: quote.items,
    subtotal: quote.subtotal,
    discount: quote.discount,
    fee: quote.fee,
    total: quote.total,
    expiresAt: quote.expiresAt,
    definitive: quote.definitive,
    network: quote.network,
    walletId: quote.walletId,
    couponCode: quote.couponCode,
  })
}

export const quoteHandlers = [
  http.post(
    '/api/quotes',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const guestId = guestActorId(request)
      const body = parseBody(quoteRequestSchema, await readJson(request))
      const quote = await withState((state) => {
        const actorId = requireActor(state, token, guestId)
        const wantsFinal =
          body.network !== undefined || body.walletId !== undefined
        let fee = state.networks.find((item) => item.id === 'demo-mainnet')?.fee
        let definitive = false
        let walletId: string | null = null
        let network: Quote['network'] = null

        if (wantsFinal) {
          if (!body.network || !body.walletId) {
            throw new ApiError(422, 'VALIDATION', 'Informe carteira e rede.', {
              walletId: 'Informe a carteira.',
              network: 'Informe a rede.',
            })
          }
          const userId = requireUser(state, token)
          const wallet = state.wallets.find((item) => item.id === body.walletId)
          if (!wallet || wallet.userId !== userId) {
            throw new ApiError(404, 'NOT_FOUND', 'Carteira não encontrada.')
          }
          const connected =
            wallet.connection.status === 'connected' &&
            wallet.connection.network === body.network
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
          fee = state.networks.find((item) => item.id === body.network)?.fee
          definitive = true
          walletId = wallet.id
          network = body.network
        }

        if (!fee) {
          throw new ApiError(404, 'NOT_FOUND', 'Rede não encontrada.')
        }

        const items = aggregateEditionLines(body.items).map((item) => {
          const found = findEdition(state, item.nftId, item.editionId)
          if (!found) {
            throw new ApiError(404, 'NOT_FOUND', 'Edição não encontrada.')
          }
          if (found.edition.availableSupply === 0) {
            throw new ApiError(409, 'SOLD_OUT', 'Estoque esgotado.')
          }
          if (item.quantity > found.edition.availableSupply) {
            throw new ApiError(
              422,
              'QUANTITY_LIMIT',
              'Quantidade acima do estoque.',
            )
          }
          return {
            nftId: item.nftId,
            editionId: item.editionId,
            quantity: item.quantity,
            unitPrice: found.edition.price,
          }
        })
        const basisPoints = couponBasisPoints(state, body.couponCode)
        const totals = quoteTotals({
          lines: items.map((item) => ({
            unitPriceWei: parseDecimalToWei(item.unitPrice),
            quantity: item.quantity,
          })),
          couponBasisPoints: basisPoints,
          feeWei: parseDecimalToWei(fee),
        })
        const created: Quote = {
          id: crypto.randomUUID(),
          actorId,
          version: 1,
          items,
          couponCode: body.couponCode ?? null,
          subtotal: formatWei(totals.subtotalWei),
          discount: formatWei(totals.discountWei),
          fee: formatWei(totals.feeWei),
          total: formatWei(totals.totalWei),
          expiresAt: new Date(
            Date.parse(state.clock) + QUOTE_TTL_MS,
          ).toISOString(),
          definitive,
          network,
          walletId,
        }
        state.quotes.push(created)
        return { state, result: presentQuote(created) }
      })
      return jsonData(quoteSchema, quote)
    }),
  ),
]
