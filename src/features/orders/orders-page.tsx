import { Link } from '@tanstack/react-router'

import { useSession } from '@/lib/session/session.ts'
import { readOrderIndex } from '@/lib/commerce/order-index.ts'

export function OrdersPage() {
  const session = useSession()
  const userId = session.data?.user.id
  const ids = userId ? readOrderIndex(userId) : []

  return (
    <main className="flex flex-col gap-[4px] min-[1440px]:gap-[96px]">
      <h1>Pedidos</h1>
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
    </main>
  )
}
