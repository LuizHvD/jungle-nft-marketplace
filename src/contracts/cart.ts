import { z } from 'zod'
import { decimalStringSchema, quantitySchema } from './money.ts'

export const cartItemInputSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: quantitySchema,
})

export const cartQuantitySchema = z.object({
  quantity: quantitySchema,
})

export const cartMergeSchema = z.object({
  guestId: z.string().trim().min(1),
})

export const cartItemSchema = z.object({
  id: z.string().min(1),
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: quantitySchema,
  unitPrice: decimalStringSchema,
  lineTotal: decimalStringSchema,
})

export const cartSchema = z.object({
  actorId: z.string().min(1),
  items: z.array(cartItemSchema),
})

export type CartResponse = z.infer<typeof cartSchema>
