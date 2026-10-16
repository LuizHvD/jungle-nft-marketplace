import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button.tsx'
import { DesktopNav } from '@/components/layout/desktop-nav.tsx'

export function SiteHeader() {
  return (
    <header className="hidden h-[45px] w-full min-[1440px]:flex min-[1440px]:flex-col min-[1440px]:justify-end">
      <div className="flex items-center">
        <Link to="/" className="inline-flex h-[34.3px] w-[160px] items-center">
          KURIO
        </Link>
        <DesktopNav />
        <div className="flex items-center">
          <Button
            onClick={() => {
              document.getElementById('catalog-search')?.focus()
            }}
          >
            Search Icon
          </Button>
          <Button>Cart</Button>
          <Button>Login</Button>
        </div>
      </div>
      <div className="h-0 w-full border-b-[0.3px] border-solid border-primary" />
    </header>
  )
}
