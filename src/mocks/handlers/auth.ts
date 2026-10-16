import { http, HttpResponse } from 'msw'
import {
  registerSchema,
  sessionSchema,
  credentialsSchema,
} from '../../contracts/auth.ts'
import { bearerToken, requireUser } from '../actor.ts'
import type { DemoState } from '../db.ts'
import { ApiError } from '../errors.ts'
import { guard } from '../failures.ts'
import { jsonData } from '../http.ts'
import { parseBody, readJson } from '../parse.ts'
import { hashPassword } from '../passwords.ts'
import { withState } from '../store.ts'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

function normalizeEmail(data: unknown): unknown {
  if (!data || typeof data !== 'object' || !('email' in data)) {
    return data
  }
  const record = data as Record<string, unknown>
  if (typeof record.email !== 'string') {
    return data
  }
  return { ...record, email: record.email.trim().toLowerCase() }
}

function openSession(state: DemoState, userId: string) {
  const user = state.users.find((item) => item.id === userId)
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Sessão ausente.')
  }
  const token = crypto.randomUUID()
  const expiresAt = new Date(
    Date.parse(state.clock) + SESSION_TTL_MS,
  ).toISOString()
  state.sessions.push({ token, userId, expiresAt })
  return sessionSchema.parse({
    token,
    expiresAt,
    user: { id: user.id, email: user.email, name: user.name },
  })
}

export const authHandlers = [
  http.post(
    '/api/auth/register',
    guard(async ({ request }) => {
      const body = parseBody(
        registerSchema,
        normalizeEmail(await readJson(request)),
      )
      const session = await withState(async (state) => {
        const emailTaken = state.users.some((user) => user.email === body.email)
        if (emailTaken) {
          throw new ApiError(409, 'CONFLICT', 'E-mail já cadastrado.', {
            email: 'E-mail já cadastrado.',
          })
        }
        const salt = crypto.randomUUID()
        const user = {
          id: crypto.randomUUID(),
          email: body.email,
          name: body.name,
          passwordSalt: salt,
          passwordHash: await hashPassword(salt, body.password),
        }
        state.users.push(user)
        state.profiles.push({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarId: null,
        })
        state.favorites.push({ userId: user.id, nftIds: [] })
        return { state, result: openSession(state, user.id) }
      })
      return jsonData(sessionSchema, session)
    }),
  ),
  http.post(
    '/api/auth/login',
    guard(async ({ request }) => {
      const body = parseBody(
        credentialsSchema,
        normalizeEmail(await readJson(request)),
      )
      const session = await withState(async (state) => {
        const user = state.users.find((item) => item.email === body.email)
        const hash = user
          ? await hashPassword(user.passwordSalt, body.password)
          : null
        if (!user || hash !== user.passwordHash) {
          throw new ApiError(401, 'UNAUTHORIZED', 'Credencial inválida.')
        }
        return { state, result: openSession(state, user.id) }
      })
      return jsonData(sessionSchema, session)
    }),
  ),
  http.get(
    '/api/auth/session',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      const session = await withState((state) => {
        const userId = requireUser(state, token)
        const current = state.sessions.find((item) => item.token === token)
        const user = state.users.find((item) => item.id === userId)
        if (!current || !user) {
          throw new ApiError(401, 'UNAUTHORIZED', 'Sessão ausente.')
        }
        return {
          state,
          result: sessionSchema.parse({
            token: current.token,
            expiresAt: current.expiresAt,
            user: { id: user.id, email: user.email, name: user.name },
          }),
        }
      })
      return jsonData(sessionSchema, session)
    }),
  ),
  http.post(
    '/api/auth/logout',
    guard(async ({ request }) => {
      const token = bearerToken(request)
      await withState((state) => {
        requireUser(state, token)
        state.sessions = state.sessions.filter((item) => item.token !== token)
        return { state, result: null }
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
