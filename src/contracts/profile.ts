import { z } from 'zod'

export const profileSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  avatarId: z.string().min(1).nullable(),
})

export const profilePatchSchema = z.object({
  name: z.string().trim().min(1),
})

export const avatarPatchSchema = z.object({
  avatarId: z.string().trim().min(1),
})

export const passwordPatchSchema = z.object({
  currentPassword: z.string().min(1),
  nextPassword: z.string().min(8),
})

export type Profile = z.infer<typeof profileSchema>
