import type { ReactNode } from 'react'

import { MobileNav } from '@/components/layout/mobile-nav.tsx'
import { MobileSearch } from '@/components/layout/mobile-search.tsx'
import { SiteFooter } from '@/components/layout/site-footer.tsx'
import { SiteHeader } from '@/components/layout/site-header.tsx'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col min-[1440px]:px-[120px] min-[1440px]:py-[24px]">
      <SiteHeader />
      <div className="px-[24px] pt-[40px] min-[1440px]:hidden">
        <MobileSearch />
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      <MobileNav />
    </div>
  )
}
