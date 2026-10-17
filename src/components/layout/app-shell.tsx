import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button.tsx'
import {
  CatalogChromeProvider,
  useCatalogChrome,
} from '@/features/catalog/catalog-chrome.tsx'
import { CatalogControls } from '@/features/catalog/catalog-controls.tsx'
import { SessionSocketBinding } from '@/features/auth/session-socket-binding.tsx'
import { cn } from '@/lib/utils.ts'
import { logout } from '@/lib/session/logout.ts'
import { readStoredSession, subscribeSession } from '@/lib/session/storage.ts'

import { MobileNav } from './mobile-nav.tsx'
import { MobileSearch } from './mobile-search.tsx'
import { SiteFooter } from './site-footer.tsx'
import { SiteHeader } from './site-header.tsx'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <CatalogChromeProvider>
      <ShellFrame>{children}</ShellFrame>
    </CatalogChromeProvider>
  )
}

function MobileAccount() {
  const client = useQueryClient()
  const stored = useSyncExternalStore(
    subscribeSession,
    readStoredSession,
    () => null,
  )
  if (!stored) {
    return null
  }
  return (
    <div className="flex items-center justify-between px-6 md:hidden">
      <Link to="/perfil" className="text-sm font-medium">
        {stored.user.name}
      </Link>
      <Button type="button" variant="ghost" onClick={() => logout(client)}>
        Sair
      </Button>
    </div>
  )
}

function ShellFrame({ children }: AppShellProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const onCatalog = pathname === '/'
  const authScreen = pathname === '/login' || pathname === '/cadastro'
  const { filtersOpen } = useCatalogChrome()

  return (
    <div className="flex min-h-dvh flex-col pb-36 md:pb-0">
      <SessionSocketBinding />
      <SiteHeader />
      <MobileAccount />
      {authScreen ? null : (
        <div className="page-container px-6 pt-4 md:px-8 min-[1440px]:px-[120px]">
          <MobileSearch />
        </div>
      )}
      <div className="page-container flex-1 px-6 md:px-8 min-[1440px]:px-[120px]">
        {onCatalog ? null : (
          <div
            id="catalog-filters"
            className={cn(filtersOpen ? 'mb-4 block' : 'hidden')}
          >
            <CatalogControls />
          </div>
        )}
        <div className="min-w-0">{children}</div>
      </div>
      <SiteFooter />
      <MobileNav />
    </div>
  )
}
