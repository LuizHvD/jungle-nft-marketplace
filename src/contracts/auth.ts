import { z } from 'zod'

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(1),
})

export const sessionUserSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
})

export const sessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.string().min(1),
  user: sessionUserSchema,
})

export type SessionResponse = z.infer<typeof sessionSchema>
