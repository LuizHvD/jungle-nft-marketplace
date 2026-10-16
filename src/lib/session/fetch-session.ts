import axios from 'axios'

import { sessionSchema, type SessionResponse } from '@/contracts/auth.ts'
import { http } from '@/lib/http/client.ts'

import { readStoredToken, writeStoredSession } from './storage.ts'

export async function fetchSession(
  signal?: AbortSignal,
): Promise<SessionResponse | null> {
  const token = readStoredToken()
  if (!token) {
    return null
  }
  const response = await http.get('/auth/session', { signal })
  const session = sessionSchema.parse(response.data)
  if (readStoredToken() !== token) {
    return null
  }
  writeStoredSession(session)
  return session
}

export async function loadSession(
  signal: AbortSignal,
): Promise<SessionResponse | null> {
  try {
    return await fetchSession(signal)
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return null
    }
    throw error
  }
}
