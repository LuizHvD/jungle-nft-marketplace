import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Search, ShoppingCart, UserRound, X } from 'lucide-react'
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react'

import { Button } from '@/components/ui/button.tsx'
import { commerceActorId, useCart } from '@/features/cart/use-cart.ts'
import { cn } from '@/lib/utils.ts'
import { logout } from '@/lib/session/logout.ts'
import { useSession } from '@/lib/session/session.ts'
import { readStoredSession, subscribeSession } from '@/lib/session/storage.ts'

const navItems = [
  { id: 'home', label: 'Início', to: '/' as const },
  { id: 'market', label: 'Mercado', to: '/' as const, hash: 'mercado' },
  { id: 'creators', label: 'Criadores', to: '/criadores' as const },
  { id: 'learn', label: 'Aprenda', to: '/aprenda' as const },
]

function cartCount(items: { quantity: number }[] | undefined): number {
  return items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0
}

export function SiteHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const session = useSession()
  const stored = useSyncExternalStore(
    subscribeSession,
    readStoredSession,
    () => null,
  )
  const user = session.data?.user ?? stored?.user ?? null
  const actorId = commerceActorId(user?.id ?? null)
  const cart = useCart(actorId)
  const count = cartCount(cart.data?.items)
  const client = useQueryClient()
  const active =
    pathname === '/criadores'
      ? 'creators'
      : pathname === '/aprenda'
        ? 'learn'
        : pathname === '/'
          ? 'home'
          : undefined

  return (
    <header className="page-container hidden md:block">
      <div className="grid h-[69px] grid-cols-[1fr_auto_1fr] items-center gap-6 border-b border-border px-6 min-[1440px]:px-[120px]">
        <Link
          to="/"
          className="justify-self-start text-base font-bold tracking-wide"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </Link>
        <nav aria-label="Principal" className="h-full">
            <ul className="flex h-full items-stretch gap-3 lg:gap-8 xl:gap-10">
            {navItems.map((item) => {
              const current = active === item.id
              return (
                <li key={item.id} className="flex">
                  <Link
                    to={item.to}
                    hash={'hash' in item ? item.hash : undefined}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                        'relative flex items-center text-sm hover:text-brand lg:text-base',
                      current
                        ? 'font-semibold text-brand after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-primary'
                        : 'text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="flex items-center justify-self-end gap-2">
          <HeaderSearch />
          <Link
            to="/carrinho"
            className="relative flex size-10 items-center justify-center rounded-full hover:bg-accent"
            aria-label={
              count > 0
                ? `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`
                : 'Carrinho'
            }
          >
            <ShoppingCart className="size-[22px]" aria-hidden="true" />
            {count > 0 ? (
              <span className="absolute top-1 right-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-ink">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </Link>
          {user ? (
            <>
              <Link
                to="/perfil"
                className="ml-3 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm hover:bg-accent"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-surface text-brand">
                  <UserRound className="size-4" aria-hidden="true" />
                </span>
                <span className="max-w-32 truncate">{user.name}</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                onClick={() => logout(client)}
              >
                Sair
              </Button>
            </>
          ) : (
            <Link
              id="header-login"
              to="/login"
              className="ml-5 flex h-[34px] items-center gap-1.5 rounded-sm bg-primary px-2.5 text-base font-medium text-ink hover:bg-primary/85"
            >
              <LogOut className="size-5" aria-hidden="true" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function HeaderSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const toggleRef = useRef<HTMLButtonElement>(null)

  function close() {
    setOpen(false)
    toggleRef.current?.focus()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const q = term.trim()
    void navigate({
      to: '/',
      search: q ? { q } : {},
      hash: 'mercado',
    })
    setOpen(false)
  }

  return (
    <div className="flex items-center">
      {open ? (
        <form onSubmit={submit} className="mr-1">
          <label htmlFor="header-search" className="sr-only">
            Buscar NFTs
          </label>
          <input
            id="header-search"
            type="search"
            value={term}
            autoFocus
            placeholder="Buscar NFTs..."
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                close()
              }
            }}
            className="h-9 w-40 rounded-sm border border-input bg-transparent px-3 text-sm placeholder:text-subtle-foreground lg:w-56"
          />
        </form>
      ) : null}
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Fechar busca' : 'Abrir busca'}
        className="flex size-10 items-center justify-center rounded-full hover:bg-accent"
        onClick={() => {
          if (open) {
            close()
            return
          }
          setOpen(true)
        }}
      >
        {open ? (
          <X className="size-[22px]" aria-hidden="true" />
        ) : (
          <Search className="size-[22px]" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
