import { useQuery, type QueryClient } from '@tanstack/react-query'

import type { SessionResponse } from '@/contracts/auth.ts'

import { connectSessionSocket } from '@/lib/realtime/session-socket.ts'

import { loadSession } from './fetch-session.ts'
import { clearPrivateCache, sessionQueryKey } from './private-cache.ts'
import { retrySessionQuery } from './retry-session.ts'
import {
  readStoredSession,
  readStoredToken,
  writeStoredSession,
} from './storage.ts'

export function sessionQueryOptions() {
  return {
    queryKey: sessionQueryKey,
    retry: retrySessionQuery,
    queryFn: ({ signal }: { signal: AbortSignal }) => loadSession(signal),
  }
}

export function useSession() {
  return useQuery({
    ...sessionQueryOptions(),
    placeholderData: () => readStoredSession(),
  })
}

export class SessionUnavailableError extends Error {
  constructor() {
    super('Não foi possível validar a sessão.')
    this.name = 'SessionUnavailableError'
  }
}

export async function ensureSession(
  client: QueryClient,
): Promise<SessionResponse | null> {
  if (!readStoredSession()) {
    client.setQueryData(sessionQueryKey, null)
    return null
  }
  try {
    return await client.fetchQuery(sessionQueryOptions())
  } catch (error) {
    if (!readStoredToken()) {
      return null
    }
    if (error instanceof SessionUnavailableError) {
      throw error
    }
    throw new SessionUnavailableError()
  }
}

export function adoptSession(
  client: QueryClient,
  session: SessionResponse,
): void {
  clearPrivateCache(client)
  writeStoredSession(session)
  client.setQueryData(sessionQueryKey, session)
  connectSessionSocket(session.token, client)
}
