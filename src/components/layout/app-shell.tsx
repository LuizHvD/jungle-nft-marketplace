import type { ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import {
  CatalogChromeProvider,
  useCatalogChrome,
} from '@/features/catalog/catalog-chrome.tsx'
import { CatalogControls } from '@/features/catalog/catalog-controls.tsx'
import { cn } from '@/lib/utils.ts'

import { MobileNav } from '@/components/layout/mobile-nav.tsx'
import { MobileSearch } from '@/components/layout/mobile-search.tsx'
import { SiteFooter } from '@/components/layout/site-footer.tsx'
import { SiteHeader } from '@/components/layout/site-header.tsx'
import { SessionSocketBinding } from '@/features/auth/session-socket-binding.tsx'
import { Button } from '@/components/ui/button.tsx'
import { logout } from '@/lib/session/logout.ts'
import { readStoredSession, subscribeSession } from '@/lib/session/storage.ts'

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
  const stored = useSyncExternalStore(subscribeSession, readStoredSession, () => null)
  if (!stored) {
    return null
  }
  return (
    <div className="flex px-[24px] min-[1440px]:hidden">
      <Link to="/perfil">{stored.user.name}</Link>
      <Button type="button" onClick={() => logout(client)}>
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
    <div className="flex min-h-dvh flex-col gap-[16px] min-[1440px]:gap-[96px] min-[1440px]:px-[120px] min-[1440px]:py-[24px]">
      <SessionSocketBinding />
      <SiteHeader />
      <MobileAccount />
      {authScreen ? null : (
        <div className="px-[24px] pt-[40px] min-[1440px]:px-0 min-[1440px]:pt-0">
          <MobileSearch />
        </div>
      )}
      <div
        data-catalog={onCatalog ? 'true' : 'false'}
        data-filters-open={filtersOpen ? 'true' : 'false'}
        className="grid flex-1 grid-cols-1 content-start data-[catalog=true]:data-[filters-open=true]:min-[1440px]:grid-cols-[240px_minmax(0,1fr)] data-[catalog=true]:data-[filters-open=true]:min-[1440px]:gap-x-[16px]"
      >
        <div
          id="catalog-filters"
          className={cn(
            'px-[24px] min-[1440px]:px-0',
            filtersOpen ? 'block' : 'hidden',
            onCatalog && 'min-[1440px]:w-[240px]',
          )}
        >
          <CatalogControls />
        </div>
        <div
          className={cn(
            'min-w-0 px-[24px] min-[1440px]:px-0',
            authScreen && 'px-0',
            onCatalog && filtersOpen && 'min-[1440px]:col-start-2',
          )}
        >
          {children}
        </div>
      </div>
      <SiteFooter />
      <MobileNav />
    </div>
  )
}
