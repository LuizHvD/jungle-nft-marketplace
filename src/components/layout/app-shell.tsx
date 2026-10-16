import type { ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'

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

function ShellFrame({ children }: AppShellProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const onCatalog = pathname === '/'
  const { filtersOpen } = useCatalogChrome()

  return (
    <div className="flex min-h-dvh flex-col gap-[16px] min-[1440px]:gap-[96px] min-[1440px]:px-[120px] min-[1440px]:py-[24px]">
      <SiteHeader />
      <div className="px-[24px] pt-[40px] min-[1440px]:px-0 min-[1440px]:pt-0">
        <MobileSearch />
      </div>
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
