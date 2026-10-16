import { http, HttpResponse } from 'msw'
import { favoriteSchema, favoritesSchema } from '../../contracts/favorites.ts'
import { bearerToken, requireUser } from '../actor.ts'
import { ApiError } from '../errors.ts'
import { guard } from '../failures.ts'
import { jsonData } from '../http.ts'
import { withState } from '../store.ts'

function listFor(
  stateFavorites: { userId: string; nftIds: string[] }[],
  userId: string,
) {
  const current = stateFavorites.find((item) => item.userId === userId)
  if (current) {
    return current
  }
  const created = { userId, nftIds: [] as string[] }
  stateFavorites.push(created)
  return created
}

export const favoriteHandlers = [
  http.get(
    '/api/favorites',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const favorites = await withState((state) => {
        const userId = requireUser(state, token)
        const current = listFor(state.favorites, userId)
        return {
          state,
          result: favoritesSchema.parse({ nftIds: [...current.nftIds] }),
        }
      })
      return jsonData(favoritesSchema, favorites)
    }),
  ),
  http.put(
    '/api/favorites/:nftId',
    guard(async ({ request, params }) => {
      const token = bearerToken(request)
      const nftId = String(params.nftId)
      const favorite = await withState((state) => {
        const userId = requireUser(state, token)
        const nft = state.nfts.find((item) => item.id === nftId)
        if (!nft) {
          throw new ApiError(404, 'NOT_FOUND', 'NFT não encontrado.')
        }
        const current = listFor(state.favorites, userId)
        if (!current.nftIds.includes(nftId)) {
          current.nftIds.push(nftId)
        }
        return { state, result: favoriteSchema.parse({ nftId }) }
      })
      return jsonData(favoriteSchema, favorite)
    }),
  ),
  http.delete(
    '/api/favorites/:nftId',
    guard(async ({ request, params }) => {
      const token = bearerToken(request)
      const nftId = String(params.nftId)
      await withState((state) => {
        const userId = requireUser(state, token)
        const current = listFor(state.favorites, userId)
        if (!current.nftIds.includes(nftId)) {
          throw new ApiError(404, 'NOT_FOUND', 'Favorito não encontrado.')
        }
        current.nftIds = current.nftIds.filter((id) => id !== nftId)
        return { state, result: null }
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
