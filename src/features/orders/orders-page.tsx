import { Link } from '@tanstack/react-router'

import { AccountNav } from '@/features/account/account-nav.tsx'
import { useSession } from '@/lib/session/session.ts'
import { readOrderIndex } from '@/lib/commerce/order-index.ts'

export function OrdersPage() {
  const session = useSession()
  const userId = session.data?.user.id
  const ids = userId ? readOrderIndex(userId) : []

  return (
    <main className="grid gap-8 py-6 md:grid-cols-[240px_minmax(0,1fr)]">
      <AccountNav />
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        {ids.length === 0 ? <p>Nenhum pedido desta sessão.</p> : null}
        <ul>
          {ids.map((orderId) => (
            <li key={orderId}>
              <Link to="/pedidos/$orderId" params={{ orderId }}>
                {orderId}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
