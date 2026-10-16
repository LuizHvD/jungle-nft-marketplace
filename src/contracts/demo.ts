import { z } from 'zod'

export const scenarioIds = [
  'slow',
  'timeout',
  'validation',
  'unauthorized',
  'forbidden',
  'not-found',
  'transient',
  'session-expired',
  'coupon-invalid',
  'coupon-expired',
  'price-change',
  'sold-out',
  'payment-declined',
  'payment-confirmed',
] as const

export const scenarioListSchema = z.object({
  scenarios: z.array(z.enum(scenarioIds)),
})

export const scenarioRequestSchema = z.object({
  id: z.enum(scenarioIds),
})

export const clockRequestSchema = z.object({
  now: z.iso.datetime({ offset: true }),
})

export const failureRequestSchema = z.object({
  latencyMs: z.number().int().nonnegative().optional(),
  status: z.number().int().min(400).max(599).optional(),
  drop: z.boolean().optional(),
})

export type ScenarioId = z.infer<typeof scenarioRequestSchema>['id']
