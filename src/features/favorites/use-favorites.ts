import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { favoriteSchema, favoritesSchema } from '@/contracts/favorites.ts'
import { http } from '@/lib/http/client.ts'
import {
  commitOwnedFavorites,
  type Favorites,
} from '@/lib/commerce/owned.ts'
import { actorStillCurrent, readActorStamp } from '@/lib/session/owned-cache.ts'

export function useFavorites(userId: string | undefined) {
  return useQuery({
    queryKey: ['favorites', userId],
    enabled: Boolean(userId),
    queryFn: async ({ signal }) => {
      const response = await http.get('/favorites', { signal })
      return favoritesSchema.parse(response.data)
    },
  })
}

export function useToggleFavorite(userId: string | undefined) {
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (input: { nftId: string; favorite: boolean }) => {
      const stamp = readActorStamp()
      if (!stamp || stamp.userId !== userId) {
        throw new Error('Sessão ausente.')
      }
      if (input.favorite) {
        const response = await http.put(`/favorites/${input.nftId}`)
        favoriteSchema.parse(response.data)
      } else {
        await http.delete(`/favorites/${input.nftId}`)
      }
      return { ...input, stamp }
    },
    onMutate: async (input) => {
      const stamp = readActorStamp()
      if (!stamp || stamp.userId !== userId) {
        return undefined
      }
      await client.cancelQueries({ queryKey: ['favorites', stamp.userId] })
      const previous = client.getQueryData<Favorites>([
        'favorites',
        stamp.userId,
      ])
      const current = previous?.nftIds ?? []
      const nftIds = input.favorite
        ? current.includes(input.nftId)
          ? current
          : [...current, input.nftId]
        : current.filter((id) => id !== input.nftId)
      commitOwnedFavorites(client, stamp, { nftIds })
      return { previous, stamp }
    },
    onError: (_error, _input, context) => {
      if (!context || !actorStillCurrent(context.stamp)) {
        return
      }
      client.setQueryData(
        ['favorites', context.stamp.userId],
        context.previous,
      )
    },
    onSuccess: (result) => {
      if (!actorStillCurrent(result.stamp)) {
        return
      }
      void client.invalidateQueries({
        queryKey: ['favorites', result.stamp.userId],
      })
    },
  })
}
