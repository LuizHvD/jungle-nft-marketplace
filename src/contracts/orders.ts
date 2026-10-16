import { z } from 'zod'
import { decimalStringSchema } from './money.ts'
import { quoteItemSchema } from './quotes.ts'

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])

export const orderCreateSchema = z.object({
  quoteId: z.string().min(1),
  expectedTotal: decimalStringSchema,
})

export const orderSnapshotSchema = z.object({
  items: z.array(quoteItemSchema),
  subtotal: decimalStringSchema,
  discount: decimalStringSchema,
  fee: decimalStringSchema,
  total: decimalStringSchema,
  couponCode: z.string().min(1).nullable(),
})

export const orderSchema = z.object({
  id: z.string().min(1),
  quoteId: z.string().min(1),
  status: orderStatusSchema,
  version: z.number().int().positive(),
  snapshot: orderSnapshotSchema,
})

export type OrderResponse = z.infer<typeof orderSchema>
