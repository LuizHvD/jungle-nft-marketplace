import { z } from 'zod'
import { decimalStringSchema, quantitySchema } from './money.ts'

export const networkSchema = z.enum(['demo-mainnet', 'demo-l2'])

export const quoteRequestSchema = z.object({
  items: z
    .array(
      z.object({
        nftId: z.string().min(1),
        editionId: z.string().min(1),
        quantity: quantitySchema,
      }),
    )
    .min(1),
  couponCode: z.string().trim().min(1).optional(),
  walletId: z.string().min(1).optional(),
  network: networkSchema.optional(),
})

export const quoteItemSchema = z.object({
  nftId: z.string().min(1),
  editionId: z.string().min(1),
  quantity: quantitySchema,
  unitPrice: decimalStringSchema,
})

export const quoteSchema = z.object({
  quoteId: z.string().min(1),
  version: z.number().int().positive(),
  items: z.array(quoteItemSchema),
  subtotal: decimalStringSchema,
  discount: decimalStringSchema,
  fee: decimalStringSchema,
  total: decimalStringSchema,
  expiresAt: z.string().min(1),
  definitive: z.boolean(),
  network: networkSchema.nullable(),
  walletId: z.string().min(1).nullable(),
  couponCode: z.string().min(1).nullable(),
})

export type QuoteResponse = z.infer<typeof quoteSchema>
