import { setupWorker } from 'msw/browser'
import { handlers } from './handlers.ts'

export const worker = setupWorker(...handlers)

export async function startMocks(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MSW === 'false') {
    return
  }

  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}
