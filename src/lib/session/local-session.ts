import type { QueryClient } from '@tanstack/react-query'

import { disconnectSessionSocket } from '@/lib/realtime/session-socket.ts'

import { clearPrivateCache, sessionQueryKey } from './private-cache.ts'
import { clearStoredSession } from './storage.ts'

export type SessionExit =
  | { kind: 'home' }
  | { kind: 'login'; returnTo: string }

type SessionNavigator = (exit: SessionExit) => void

let sessionNavigator: SessionNavigator = () => {}

export function registerSessionNavigator(navigator: SessionNavigator): void {
  sessionNavigator = navigator
}

export function endLocalSession(client: QueryClient, exit: SessionExit): void {
  disconnectSessionSocket()
  clearStoredSession()
  clearPrivateCache(client)
  client.setQueryData(sessionQueryKey, null)
  sessionNavigator(exit)
}
