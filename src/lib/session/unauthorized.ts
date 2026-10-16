import type { QueryClient } from '@tanstack/react-query'

import { endLocalSession } from './local-session.ts'

export type UnauthorizedDecision = 'ignore' | 'keep' | 'end'

export type UnauthorizedInput = {
  method: string
  url: string
  requestToken: string | null
  currentToken: string | null
  code: string | null
}

export function requestPath(url: string): string {
  const withoutOrigin = url.replace(/^https?:\/\/[^/]+/i, '')
  const withoutApi = withoutOrigin.startsWith('/api/')
    ? withoutOrigin.slice(4)
    : withoutOrigin
  const path = withoutApi.split('?')[0] ?? withoutApi
  if (path.startsWith('/')) {
    return path
  }
  return `/${path}`
}

export function unauthorizedDecision(
  input: UnauthorizedInput,
): UnauthorizedDecision {
  if (!input.requestToken || input.requestToken !== input.currentToken) {
    return 'ignore'
  }
  const method = input.method.toUpperCase()
  const path = requestPath(input.url)
  if (method === 'POST' && path === '/auth/login') {
    return 'keep'
  }
  if (method === 'POST' && path === '/auth/logout') {
    return 'ignore'
  }
  if (
    method === 'PATCH' &&
    path === '/profile/password' &&
    input.code === 'UNAUTHORIZED'
  ) {
    return 'keep'
  }
  if (input.code === 'SESSION_EXPIRED' || input.code === 'UNAUTHORIZED') {
    return 'end'
  }
  return 'ignore'
}

export function handleUnauthorized(
  input: UnauthorizedInput,
  client: QueryClient,
  returnTo: string,
): UnauthorizedDecision {
  const decision = unauthorizedDecision(input)
  if (decision === 'end') {
    endLocalSession(client, { kind: 'login', returnTo })
  }
  return decision
}
