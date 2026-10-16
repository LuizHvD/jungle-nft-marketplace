import { z } from 'zod'
import { decimalStringSchema } from './money.ts'

export const editionSchema = z.object({
  id: z.string().min(1),
  price: decimalStringSchema,
  availableSupply: z.number().int().nonnegative(),
})

export const nftSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  editions: z.array(editionSchema),
})

export const nftListQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(['relevance', 'price-asc', 'price-desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(50).optional(),
  available: z.enum(['true', 'false']).optional(),
})

export const nftPageSchema = z.object({
  items: z.array(nftSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})

export type Nft = z.infer<typeof nftSchema>
export type NftPage = z.infer<typeof nftPageSchema>
