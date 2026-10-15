import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'

import { AppShell } from '../components/layout/app-shell.tsx'
import { FoundationPage } from '../features/foundation/foundation-page.tsx'
import { SpikePage } from '../features/spike/spike-page.tsx'

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: SpikePage,
})

const foundationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fundacao',
  component: FoundationPage,
})

const routeTree = rootRoute.addChildren([indexRoute, foundationRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
