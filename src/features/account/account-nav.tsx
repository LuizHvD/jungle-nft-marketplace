import { Link, useRouterState } from '@tanstack/react-router'
import { Heart, ShoppingBag, UserRound, Wallet } from 'lucide-react'

import { cn } from '@/lib/utils.ts'

const items = [
  { label: 'Dados do perfil', to: '/perfil' as const, icon: UserRound },
  { label: 'Carteiras', to: '/carteiras' as const, icon: Wallet },
  { label: 'Lista de interesse', to: '/favoritos' as const, icon: Heart },
  { label: 'Pedidos', to: '/pedidos' as const, icon: ShoppingBag },
]

const soon = ['Atividade', 'Ofertas', 'Arquivos baixados', 'Suporte']

export function AccountNav() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <>
      <nav
        aria-label="Minha conta"
        className="hidden self-start bg-surface py-5 md:block"
      >
        <p className="px-5 pb-3 text-base font-bold">Meu perfil</p>
        <ul>
          {items.map((item) => {
            const current =
              pathname === item.to || pathname.startsWith(`${item.to}/`)
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'relative flex h-11 items-center gap-3 px-5 text-sm text-muted-foreground hover:text-brand',
                    current &&
                      'font-semibold text-brand before:absolute before:inset-y-1 before:left-0 before:w-[5px] before:bg-primary',
                  )}
                >
                  <item.icon className="size-[18px]" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            )
          })}
          {soon.map((label) => (
            <li key={label}>
              <span className="flex h-11 items-center gap-3 px-5 text-sm text-subtle-foreground">
                {label}
                <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[11px]">
                  Em breve
                </span>
              </span>
            </li>
          ))}
        </ul>
      </nav>
      <nav aria-label="Minha conta" className="-mx-0 overflow-x-auto md:hidden">
        <ul className="flex w-max gap-2 pb-1">
          {items.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={pathname === item.to ? 'page' : undefined}
                className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm whitespace-nowrap text-muted-foreground aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:font-semibold aria-[current=page]:text-ink"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
