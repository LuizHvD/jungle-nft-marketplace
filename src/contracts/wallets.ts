import { z } from 'zod'
import { networkSchema } from './quotes.ts'

export const walletRoleSchema = z.enum(['primary', 'secondary'])
export const connectionStatusSchema = z.enum([
  'disconnected',
  'connected',
  'rejected',
])

export const walletCreateSchema = z.object({
  label: z.string().trim().min(1),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  role: walletRoleSchema,
})

export const walletPatchSchema = walletCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe um campo.',
  })

export const walletConnectionSchema = z.object({
  network: networkSchema,
  action: z.enum(['connect', 'disconnect', 'reject']),
})

export const walletSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  role: walletRoleSchema,
  connection: z.object({
    network: networkSchema.nullable(),
    status: connectionStatusSchema,
  }),
})

export const walletListSchema = z.object({
  wallets: z.array(walletSchema),
})

export type Wallet = z.infer<typeof walletSchema>
