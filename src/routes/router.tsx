import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'

import { AppShell } from '../components/layout/app-shell.tsx'
import { parseCatalogSearch } from '../features/catalog/catalog-search.ts'
import { CatalogPage } from '../features/catalog/catalog-page.tsx'
import { FoundationPage } from '../features/foundation/foundation-page.tsx'
import { NftDetailPage } from '../features/nft/nft-detail-page.tsx'
import { UnknownRoutePage } from '../features/nft/unknown-route-page.tsx'
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
  spikeRoute,
  foundationRoute,
  unknownRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
