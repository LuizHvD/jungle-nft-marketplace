import type { DemoState } from './db.ts'
import { ApiError } from './errors.ts'

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) {
    return null
  }
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }
  return token
}

export function guestActorId(request: Request): string | null {
  const guestId = request.headers.get('x-guest-id')?.trim()
  if (!guestId) {
    return null
  }
  return `guest:${guestId}`
}

export function requireUser(state: DemoState, token: string | null): string {
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Sessão ausente.')
  }
  const session = state.sessions.find((item) => item.token === token)
  if (!session) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Sessão ausente.')
  }
  if (Date.parse(session.expiresAt) <= Date.parse(state.clock)) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'Sessão expirada.')
  }
  return session.userId
}

export function requireActor(
  state: DemoState,
  token: string | null,
  guestId: string | null,
): string {
  if (token) {
    return requireUser(state, token)
  }
  if (guestId) {
    return guestId
  }
  throw new ApiError(400, 'VALIDATION', 'Informe a sessão ou o visitante.', {
    guestId: 'Informe o visitante.',
  })
}
