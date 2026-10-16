import { z } from 'zod'
import { decimalStringSchema } from './money.ts'
import { orderStatusSchema } from './orders.ts'

export const nftUpdatedEventSchema = z.object({
  eventId: z.string().min(1),
  nftId: z.string().min(1),
  editionId: z.string().min(1).optional(),
  version: z.number().int().positive(),
  price: decimalStringSchema,
  availableSupply: z.number().int().nonnegative().optional(),
})

export const orderUpdatedEventSchema = z.object({
  eventId: z.string().min(1),
  orderId: z.string().min(1),
  version: z.number().int().positive(),
  status: orderStatusSchema,
})

export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
