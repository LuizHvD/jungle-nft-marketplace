import { Link, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button.tsx'
import { DesktopNav } from '@/components/layout/desktop-nav.tsx'
import { logout } from '@/lib/session/logout.ts'
import {
  readStoredSession,
  subscribeSession,
} from '@/lib/session/storage.ts'

function HeaderAccount() {
  const client = useQueryClient()
  const stored = useSyncExternalStore(subscribeSession, readStoredSession, () => null)
  const href = useRouterState({ select: (state) => state.location.href })
  if (stored) {
    return (
      <>
        <Link to="/perfil">{stored.user.name}</Link>
        <Button type="button" onClick={() => logout(client)}>
          Sair
        </Button>
      </>
    )
  }
  return (
    <Link id="header-login" to="/login" search={{ returnTo: href }}>
      Login
    </Link>
  )
}

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
          <HeaderAccount />
        </div>
      </div>
      <div className="h-0 w-full border-b-[0.3px] border-solid border-primary" />
    </header>
  )
}
