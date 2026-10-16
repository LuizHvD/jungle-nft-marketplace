import { z } from 'zod'

export const errorCodes = [
  'VALIDATION',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'SOLD_OUT',
  'QUANTITY_LIMIT',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'QUOTE_STALE',
  'IDEMPOTENCY_CONFLICT',
  'TRANSIENT',
] as const

export const errorCodeSchema = z.enum(errorCodes)

export const errorBodySchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1),
  fieldErrors: z.record(z.string(), z.string()).optional(),
})

export type ErrorBody = z.infer<typeof errorBodySchema>
