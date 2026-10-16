import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { AppShell } from '../components/layout/app-shell.tsx'
import { queryClient } from '../app/query-client.ts'
import { PrivatePlaceholder } from '../features/account/private-placeholder.tsx'
import { parseCatalogSearch } from '../features/catalog/catalog-search.ts'
import { CatalogPage } from '../features/catalog/catalog-page.tsx'
import { LoginPage } from '../features/auth/login-page.tsx'
import { RegisterPage } from '../features/auth/register-page.tsx'
import { SessionUnavailablePage } from '../features/auth/session-unavailable.tsx'
import { FoundationPage } from '../features/foundation/foundation-page.tsx'
import { NftDetailPage } from '../features/nft/nft-detail-page.tsx'
import { UnknownRoutePage } from '../features/nft/unknown-route-page.tsx'
import { ProfilePage } from '../features/profile/profile-page.tsx'
import { SpikePage } from '../features/spike/spike-page.tsx'
import { WalletsPage } from '../features/wallets/wallets-page.tsx'
import { ensureSession } from '../lib/session/session.ts'

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function parseAuthSearch(search: Record<string, unknown>) {
  if (typeof search.returnTo === 'string' && search.returnTo.length > 0) {
    return { returnTo: search.returnTo }
  }
  return {}
}

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
})

async function requireSession({
  context,
  location,
}: {
  context: { queryClient: QueryClient }
  location: { href: string }
}) {
  const session = await ensureSession(context.queryClient)
  if (session) {
    return
  }
  throw redirect({
    to: '/login',
    search: { returnTo: location.href },
  })
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) =>
    parseCatalogSearch(search),
  component: CatalogPage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  component: function NftRoute() {
    const { nftId } = nftRoute.useParams()
    return <NftDetailPage nftId={nftId} />
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: parseAuthSearch,
  component: LoginPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cadastro',
  validateSearch: parseAuthSearch,
  component: RegisterPage,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  beforeLoad: requireSession,
  errorComponent: SessionUnavailablePage,
  component: ProfilePage,
})

const walletsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/carteiras',
  beforeLoad: requireSession,
  errorComponent: SessionUnavailablePage,
  component: WalletsPage,
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  beforeLoad: requireSession,
  errorComponent: SessionUnavailablePage,
  component: function CheckoutPlaceholder() {
    return <PrivatePlaceholder title="Checkout" />
  },
})

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favoritos',
  beforeLoad: requireSession,
  errorComponent: SessionUnavailablePage,
  component: function FavoritesPlaceholder() {
    return <PrivatePlaceholder title="Favoritos" />
  },
})

const ordersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedidos',
  beforeLoad: requireSession,
  errorComponent: SessionUnavailablePage,
  component: function OrdersPlaceholder() {
    return <PrivatePlaceholder title="Pedidos" />
  },
})

const spikeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spike',
  component: SpikePage,
})

const foundationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/fundacao',
  component: FoundationPage,
})

const unknownRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  component: UnknownRoutePage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  nftRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  walletsRoute,
  checkoutRoute,
  favoritesRoute,
  ordersRoute,
  spikeRoute,
  foundationRoute,
  unknownRoute,
])

export const router = createRouter({
  routeTree,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
