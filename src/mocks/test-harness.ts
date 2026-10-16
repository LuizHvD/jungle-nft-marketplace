import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { handlers } from './handlers.ts'
import { createSeed } from './fixtures/seed.ts'
import { createMemoryStore, installStore } from './store.ts'

export const server = setupServer(...handlers)

export function startMockServer(): void {
  beforeAll(() => {
    if (typeof globalThis.location === 'undefined') {
      globalThis.location = { href: 'http://127.0.0.1/' } as Location
    }
    server.listen({ onUnhandledRequest: 'error' })
  })
  beforeEach(async () => {
    installStore(createMemoryStore(await createSeed()))
  })
  afterEach(() => {
    server.resetHandlers()
  })
  afterAll(() => {
    server.close()
  })
}

type ApiResult = {
  status: number
  data: Record<string, unknown> | null
}

export async function api(
  path: string,
  init?: RequestInit & { token?: string; guestId?: string },
): Promise<ApiResult> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  if (init?.token) {
    headers.set('authorization', `Bearer ${init.token}`)
  }
  if (init?.guestId) {
    headers.set('x-guest-id', init.guestId)
  }
  const response = await fetch(new URL(path, 'http://127.0.0.1'), {
    ...init,
    headers,
  })
  const text = await response.text()
  return {
    status: response.status,
    data: text ? (JSON.parse(text) as Record<string, unknown>) : null,
  }
}
