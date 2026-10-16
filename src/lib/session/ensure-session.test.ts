import { QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./fetch-session.ts', () => ({
  loadSession: vi.fn(),
}))

import { loadSession } from './fetch-session.ts'
import { ensureSession, SessionUnavailableError } from './session.ts'
import {
  clearStoredSession,
  readStoredToken,
  setSessionStore,
  writeStoredSession,
} from './storage.ts'

const ada = {
  token: 'token-ada',
  expiresAt: '2020-01-01T00:00:00.000Z',
  user: { id: 'user-ada', email: 'ada@demo.jungle', name: 'Ada Demo' },
}

function memoryStore() {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
    removeItem: (key: string) => {
      items.delete(key)
    },
  }
}

function serverError() {
  return new AxiosError('falha', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status: 500,
    data: { code: 'TRANSIENT', message: 'Falha simulada.' },
    statusText: 'error',
    headers: {},
    config: {} as never,
  })
}

describe('ensureSession', () => {
  beforeEach(() => {
    setSessionStore(memoryStore())
    vi.mocked(loadSession).mockReset()
  })

  afterEach(() => {
    setSessionStore(null)
  })

  it('devolve nulo no 401 para a rota redirecionar', async () => {
    writeStoredSession(ada)
    vi.mocked(loadSession).mockResolvedValue(null)
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    await expect(ensureSession(client)).resolves.toBeNull()
    expect(readStoredToken()).toBe(ada.token)
  })

  it('redireciona quando o 401 já removeu o token', async () => {
    writeStoredSession(ada)
    vi.mocked(loadSession).mockImplementation(async () => {
      clearStoredSession()
      throw new Error('cancelada')
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, retryDelay: 0 } },
    })
    await expect(ensureSession(client)).resolves.toBeNull()
    expect(readStoredToken()).toBeNull()
  })

  it('mantém o token e bloqueia a rota quando a validação falha na rede', async () => {
    writeStoredSession(ada)
    vi.mocked(loadSession).mockRejectedValue(serverError())
    const client = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    })
    await expect(ensureSession(client)).rejects.toBeInstanceOf(SessionUnavailableError)
    expect(readStoredToken()).toBe(ada.token)
    expect(client.getQueryData(['session'])).not.toEqual(ada)
  })
})
