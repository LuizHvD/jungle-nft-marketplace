import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { registerSessionNavigator } from '../lib/session/local-session.ts'
import { safeReturnTo } from '../lib/session/return-to.ts'
import { queryClient } from './query-client.ts'
import { router } from '../routes/router.tsx'

registerSessionNavigator((exit) => {
  if (exit.kind === 'home') {
    void router.navigate({ to: '/' })
    return
  }
  void router.navigate({
    to: '/login',
    search: { returnTo: safeReturnTo(exit.returnTo) },
  })
})

export function renderApp(rootElement: HTMLElement): void {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}
