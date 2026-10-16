import { sessionSchema, type SessionResponse } from '@/contracts/auth.ts'

export const sessionStorageKey = 'jungle.session'

type SessionStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

let storeOverride: SessionStore | null = null
let cachedRaw: string | null | undefined
let cachedSession: SessionResponse | null = null
const sessionListeners = new Set<() => void>()

export function setSessionStore(store: SessionStore | null): void {
  storeOverride = store
}

export function subscribeSession(listener: () => void): () => void {
  sessionListeners.add(listener)
  return () => {
    sessionListeners.delete(listener)
  }
}

function emitSession(): void {
  for (const listener of sessionListeners) {
    listener()
  }
}

function store(): SessionStore {
  if (storeOverride) {
    return storeOverride
  }
  return localStorage
}

export function readStoredSession(): SessionResponse | null {
  const raw = store().getItem(sessionStorageKey)
  if (raw === cachedRaw) {
    return cachedSession
  }
  cachedRaw = raw
  if (!raw) {
    cachedSession = null
    return null
  }
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw))
    cachedSession = parsed.success ? parsed.data : null
  } catch {
    cachedSession = null
  }
  return cachedSession
}

export function readStoredToken(): string | null {
  return readStoredSession()?.token ?? null
}

export function writeStoredSession(session: SessionResponse): void {
  const parsed = sessionSchema.parse(session)
  const raw = JSON.stringify(parsed)
  store().setItem(sessionStorageKey, raw)
  cachedRaw = raw
  cachedSession = parsed
  emitSession()
}

export function clearStoredSession(): void {
  store().removeItem(sessionStorageKey)
  cachedRaw = null
  cachedSession = null
  emitSession()
}
