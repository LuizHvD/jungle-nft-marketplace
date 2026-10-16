import type { QueryClient } from '@tanstack/react-query'

import { http } from '@/lib/http/client.ts'

import { endLocalSession, type SessionExit } from './local-session.ts'
import { readStoredToken } from './storage.ts'

export function revokeSession(token: string): Promise<unknown> {
  return http.post('/auth/logout', null, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function logout(
  client: QueryClient,
  exit: SessionExit = { kind: 'home' },
  revoke: (token: string) => Promise<unknown> = revokeSession,
): void {
  const token = readStoredToken()
  if (token) {
    try {
      void Promise.resolve(revoke(token)).catch(() => undefined)
    } catch {
      // A falha síncrona da revogação não impede a limpeza local.
    }
  }
  endLocalSession(client, exit)
}
