import { setupWorker } from 'msw/browser'
import type { Socket } from 'socket.io-client'
import { handlers } from './handlers.ts'
import { createIndexedDbStore, installStore } from './store.ts'

declare global {
  interface Window {
    __jungleConnect?: (token?: string) => Socket
  }
}

export const worker = setupWorker(...handlers)

export async function startMocks(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MSW === 'false') {
    return
  }

  installStore(createIndexedDbStore())
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })

  const { io } = await import('socket.io-client')
  window.__jungleConnect = (token) =>
    io(window.location.origin, {
      path: '/socket.io/',
      transports: ['websocket'],
      ...(token ? { query: { token } } : {}),
    })
}
