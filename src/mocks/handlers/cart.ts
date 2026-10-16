import { http } from 'msw'
import {
  cartItemInputSchema,
  cartMergeSchema,
  cartQuantitySchema,
  cartSchema,
  type CartResponse,
} from '../../contracts/cart.ts'
import {
  formatWei,
  multiplyQuantity,
  parseDecimalToWei,
} from '../../domain/money.ts'
import { mergeCartLines } from '../../domain/cart-merge.ts'
import {
  bearerToken,
  guestActorId,
  requireActor,
  requireUser,
} from '../actor.ts'
import { findCart, findEdition, type DemoState } from '../db.ts'
import { ApiError } from '../errors.ts'
import { guard } from '../failures.ts'
import { jsonData } from '../http.ts'
import { parseBody, readJson } from '../parse.ts'
import { withState } from '../store.ts'

function presentCart(state: DemoState, actorId: string): CartResponse {
  const cart = findCart(state, actorId)
  return cartSchema.parse({
    actorId,
    items: cart.items.map((item) => {
      const found = findEdition(state, item.nftId, item.editionId)
      if (!found) {
        throw new ApiError(404, 'NOT_FOUND', 'Edição não encontrada.')
      }
      const lineTotal = formatWei(
        multiplyQuantity(parseDecimalToWei(found.edition.price), item.quantity),
      )
      return {
        ...item,
        unitPrice: found.edition.price,
        lineTotal,
      }
    }),
  })
}

export const cartHandlers = [
  http.get(
    '/api/cart',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const guestId = guestActorId(request)
      const cart = await withState((state) => {
        const actorId = requireActor(state, token, guestId)
        return { state, result: presentCart(state, actorId) }
      })
      return jsonData(cartSchema, cart)
    }),
  ),
  http.post(
    '/api/cart/items',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const guestId = guestActorId(request)
      const body = parseBody(cartItemInputSchema, await readJson(request))
      const cart = await withState((state) => {
        const actorId = requireActor(state, token, guestId)
        const found = findEdition(state, body.nftId, body.editionId)
        if (!found) {
          throw new ApiError(404, 'NOT_FOUND', 'Edição não encontrada.')
        }
        if (found.edition.availableSupply === 0) {
          throw new ApiError(409, 'SOLD_OUT', 'Estoque esgotado.')
        }
        const current = findCart(state, actorId)
        const existing = current.items.find(
          (item) =>
            item.nftId === body.nftId && item.editionId === body.editionId,
        )
        const nextQuantity = (existing?.quantity ?? 0) + body.quantity
        if (nextQuantity > found.edition.availableSupply) {
          throw new ApiError(
            422,
            'QUANTITY_LIMIT',
            'Quantidade acima do estoque.',
          )
        }
        if (existing) {
          existing.quantity = nextQuantity
        } else {
          current.items.push({
            id: crypto.randomUUID(),
            nftId: body.nftId,
            editionId: body.editionId,
            quantity: body.quantity,
          })
        }
        return { state, result: presentCart(state, actorId) }
      })
      return jsonData(cartSchema, cart)
    }),
  ),
  http.patch(
    '/api/cart/items/:id',
    guard(async ({ request, params }) => {
      const token = bearerToken(request)
      const guestId = guestActorId(request)
      const itemId = String(params.id)
      const body = parseBody(cartQuantitySchema, await readJson(request))
      const cart = await withState((state) => {
        const actorId = requireActor(state, token, guestId)
        const owned = findCart(state, actorId).items.find(
          (item) => item.id === itemId,
        )
        const foreign = state.carts.some(
          (cart) =>
            cart.actorId !== actorId &&
            cart.items.some((item) => item.id === itemId),
        )
        if (!owned && foreign) {
          throw new ApiError(403, 'FORBIDDEN', 'Item de outro ator.')
        }
        if (!owned) {
          throw new ApiError(404, 'NOT_FOUND', 'Item não encontrado.')
        }
        const found = findEdition(state, owned.nftId, owned.editionId)
        if (!found) {
          throw new ApiError(404, 'NOT_FOUND', 'Edição não encontrada.')
        }
        if (body.quantity > found.edition.availableSupply) {
          throw new ApiError(
            422,
            'QUANTITY_LIMIT',
            'Quantidade acima do estoque.',
          )
        }
        owned.quantity = body.quantity
        return { state, result: presentCart(state, actorId) }
      })
      return jsonData(cartSchema, cart)
    }),
  ),
  http.delete(
    '/api/cart/items/:id',
    guard(async ({ request, params }) => {
      const token = bearerToken(request)
      const guestId = guestActorId(request)
      const itemId = String(params.id)
      const cart = await withState((state) => {
        const actorId = requireActor(state, token, guestId)
        const current = findCart(state, actorId)
        const owned = current.items.some((item) => item.id === itemId)
        const foreign = state.carts.some(
          (cart) =>
            cart.actorId !== actorId &&
            cart.items.some((item) => item.id === itemId),
        )
        if (!owned && foreign) {
          throw new ApiError(403, 'FORBIDDEN', 'Item de outro ator.')
        }
        if (!owned) {
          throw new ApiError(404, 'NOT_FOUND', 'Item não encontrado.')
        }
        current.items = current.items.filter((item) => item.id !== itemId)
        return { state, result: presentCart(state, actorId) }
      })
      return jsonData(cartSchema, cart)
    }),
  ),
  http.post(
    '/api/cart/merge',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const body = parseBody(cartMergeSchema, await readJson(request))
      const cart = await withState((state) => {
        const userId = requireUser(state, token)
        const guestId = `guest:${body.guestId}`
        const userCart = findCart(state, userId)
        const guestCart = findCart(state, guestId)
        const merged = mergeCartLines(
          userCart.items,
          guestCart.items,
          (nftId, editionId) =>
            findEdition(state, nftId, editionId)?.edition.availableSupply ?? 0,
        )
        userCart.items = merged.map((line) => {
          const existing = userCart.items.find(
            (item) =>
              item.nftId === line.nftId && item.editionId === line.editionId,
          )
          return {
            id: existing?.id ?? crypto.randomUUID(),
            ...line,
          }
        })
        guestCart.items = []
        return { state, result: presentCart(state, userId) }
      })
      return jsonData(cartSchema, cart)
    }),
  ),
]
