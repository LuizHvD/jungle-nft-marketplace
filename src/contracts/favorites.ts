import { z } from 'zod'

export const favoritesSchema = z.object({
  nftIds: z.array(z.string().min(1)),
})

export const favoriteSchema = z.object({
  nftId: z.string().min(1),
})
