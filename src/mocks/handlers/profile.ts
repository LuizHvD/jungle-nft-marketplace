import { http, HttpResponse } from 'msw'
import {
  avatarPatchSchema,
  passwordPatchSchema,
  profilePatchSchema,
  profileSchema,
} from '../../contracts/profile.ts'
import { bearerToken, requireUser } from '../actor.ts'
import { ApiError } from '../errors.ts'
import { guard } from '../failures.ts'
import { jsonData } from '../http.ts'
import { parseBody, readJson } from '../parse.ts'
import { hashPassword } from '../passwords.ts'
import { withState } from '../store.ts'

export const profileHandlers = [
  http.get(
    '/api/profile',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const profile = await withState((state) => {
        const userId = requireUser(state, token)
        const current = state.profiles.find((item) => item.id === userId)
        if (!current) {
          throw new ApiError(404, 'NOT_FOUND', 'Perfil não encontrado.')
        }
        return { state, result: profileSchema.parse(current) }
      })
      return jsonData(profileSchema, profile)
    }),
  ),
  http.patch(
    '/api/profile',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const body = parseBody(profilePatchSchema, await readJson(request))
      const profile = await withState((state) => {
        const userId = requireUser(state, token)
        const current = state.profiles.find((item) => item.id === userId)
        const user = state.users.find((item) => item.id === userId)
        if (!current || !user) {
          throw new ApiError(404, 'NOT_FOUND', 'Perfil não encontrado.')
        }
        current.name = body.name
        user.name = body.name
        return { state, result: profileSchema.parse(current) }
      })
      return jsonData(profileSchema, profile)
    }),
  ),
  http.patch(
    '/api/profile/avatar',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const body = parseBody(avatarPatchSchema, await readJson(request))
      const profile = await withState((state) => {
        const userId = requireUser(state, token)
        const current = state.profiles.find((item) => item.id === userId)
        if (!current) {
          throw new ApiError(404, 'NOT_FOUND', 'Perfil não encontrado.')
        }
        current.avatarId = body.avatarId
        return { state, result: profileSchema.parse(current) }
      })
      return jsonData(profileSchema, profile)
    }),
  ),
  http.patch(
    '/api/profile/password',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const body = parseBody(passwordPatchSchema, await readJson(request))
      await withState(async (state) => {
        const userId = requireUser(state, token)
        const user = state.users.find((item) => item.id === userId)
        if (!user) {
          throw new ApiError(404, 'NOT_FOUND', 'Perfil não encontrado.')
        }
        const currentHash = await hashPassword(
          user.passwordSalt,
          body.currentPassword,
        )
        if (currentHash !== user.passwordHash) {
          throw new ApiError(401, 'UNAUTHORIZED', 'Senha atual inválida.')
        }
        user.passwordSalt = crypto.randomUUID()
        user.passwordHash = await hashPassword(
          user.passwordSalt,
          body.nextPassword,
        )
        return { state, result: null }
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
