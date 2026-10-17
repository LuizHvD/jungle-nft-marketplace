import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, House, ScanLine, ShoppingCart, UserRound } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { commerceActorId, useCart } from '@/features/cart/use-cart.ts'
import { cn } from '@/lib/utils.ts'
import { readStoredSession, subscribeSession } from '@/lib/session/storage.ts'

function cartCount(items: { quantity: number }[] | undefined): number {
  return items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

export function MobileNav() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const stored = useSyncExternalStore(
    subscribeSession,
    readStoredSession,
    () => null,
  )
  const signedIn = Boolean(stored)
  const cart = useCart(commerceActorId(stored?.user.id ?? null))
  const count = cartCount(cart.data?.items)
  const profileTarget = signedIn
    ? { to: '/perfil' as const }
    : { to: '/login' as const, search: { returnTo: '/perfil' } }
  const favoritesTarget = signedIn
    ? { to: '/favoritos' as const }
    : { to: '/login' as const, search: { returnTo: '/favoritos' } }

  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative rounded-t-[32px] bg-surface pt-5">
        <span
          aria-hidden="true"
          className="absolute -top-[45px] left-1/2 size-[90px] -translate-x-1/2 rounded-full bg-background"
        />
        <Link
          to="/"
          hash="mercado"
          className="absolute -top-[30px] left-1/2 z-10 flex size-[60px] -translate-x-1/2 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dc9c63_0%,#a8703f_100%)] text-foreground shadow-lg shadow-black/30"
        >
          <ScanLine className="size-7" aria-hidden="true" />
          <span className="sr-only">Explorar coleções</span>
        </Link>
        <ul className="relative grid h-[69px] grid-cols-5 items-start px-3">
          <li className="flex justify-center">
            <Link
              to="/"
              aria-current={pathname === '/' ? 'page' : undefined}
              className={cn(
                'flex size-12 items-center justify-center rounded-full',
                pathname === '/' ? 'text-brand' : 'text-muted-foreground',
              )}
            >
              <House className="size-5" aria-hidden="true" />
              <span className="sr-only">Início</span>
            </Link>
          </li>
          <li className="flex justify-center">
            <Link
              {...favoritesTarget}
              aria-current={pathname === '/favoritos' ? 'page' : undefined}
              className={cn(
                'flex size-12 items-center justify-center rounded-full',
                pathname === '/favoritos'
                  ? 'text-brand'
                  : 'text-muted-foreground',
              )}
            >
              <Heart className="size-5" aria-hidden="true" />
              <span className="sr-only">Favoritos</span>
            </Link>
          </li>
          <li aria-hidden="true" />
          <li className="flex justify-center">
            <Link
              to="/carrinho"
              aria-current={pathname === '/carrinho' ? 'page' : undefined}
              className={cn(
                'relative flex size-12 items-center justify-center rounded-full',
                pathname === '/carrinho'
                  ? 'text-brand'
                  : 'text-muted-foreground',
              )}
            >
              <ShoppingCart className="size-5" aria-hidden="true" />
              <span className="sr-only">
                Carrinho{count > 0 ? `, ${count} itens` : ''}
              </span>
              {count > 0 ? (
                <span className="absolute top-2 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-ink">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </Link>
          </li>
          <li className="flex justify-center">
            <Link
              id="tab-user"
              {...profileTarget}
              aria-current={pathname === '/perfil' ? 'page' : undefined}
              className={cn(
                'flex size-12 items-center justify-center rounded-full',
                pathname === '/perfil' ? 'text-brand' : 'text-muted-foreground',
              )}
            >
              <UserRound className="size-5" aria-hidden="true" />
              <span className="sr-only">Perfil</span>
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
