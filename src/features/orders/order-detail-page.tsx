import { useQuery } from '@tanstack/react-query'

import { orderSchema } from '@/contracts/orders.ts'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { http } from '@/lib/http/client.ts'
import { apiErrorMessage, isNotFoundError } from '@/lib/http/error.ts'
import { useSession } from '@/lib/session/session.ts'
import { readActorStamp } from '@/lib/session/owned-cache.ts'
import { shareOrderData } from '@/lib/realtime/apply-realtime.ts'

import { MoneySummary } from '@/features/cart/money-summary.tsx'

type OrderDetailPageProps = {
  orderId: string
}

export function OrderDetailPage({ orderId }: OrderDetailPageProps) {
  const session = useSession()
  const userId = session.data?.user.id
  const order = useQuery({
    queryKey: ['orders', userId, orderId],
    enabled: Boolean(userId),
    retry: false,
    structuralSharing: shareOrderData,
    queryFn: async ({ signal }) => {
      const stamp = readActorStamp()
      const response = await http.get(`/orders/${orderId}`, { signal })
      const parsed = orderSchema.parse(response.data)
      if (!stamp || stamp.userId !== userId) {
        throw new Error('Pedido de outro ator.')
      }
      return parsed
    },
  })

  if (order.isPending) {
    return (
      <main aria-busy="true">
        <h1>Pedido</h1>
        <Skeleton data-testid="order-skeleton" className="h-[45px] w-full" />
      </main>
    )
  }

  if (order.isError && isNotFoundError(order.error)) {
    return (
      <main>
        <h1>Pedido não encontrado.</h1>
      </main>
    )
  }

  if (order.isError || !order.data) {
    return (
      <main>
        <h1>Pedido</h1>
        <p>
          {apiErrorMessage(order.error, 'Não foi possível carregar o pedido.')}
        </p>
        <button type="button" onClick={() => void order.refetch()}>
          Tentar de novo
        </button>
      </main>
    )
  }

  const current = order.data
  const confirmed = current.status === 'confirmed'

  return (
    <main className="flex flex-col gap-[4px] px-0 min-[1440px]:gap-[96px]">
      <h1>Pedido</h1>
      <p data-testid="order-id">{current.id}</p>
      <p data-testid="order-status" aria-live="polite">
        {current.status}
      </p>
      {confirmed ? (
        <section
          aria-label="Order Confirmation Modal"
          data-testid="order-receipt"
        >
          <h2>Recibo</h2>
          <p>Transação {current.id}</p>
          <ul>
            {current.snapshot.items.map((item) => (
              <li key={`${item.nftId}:${item.editionId}`}>
                {item.nftId} {item.editionId} {item.quantity} {item.unitPrice}
              </li>
            ))}
          </ul>
          <MoneySummary
            subtotal={current.snapshot.subtotal}
            discount={current.snapshot.discount}
            fee={current.snapshot.fee}
            total={current.snapshot.total}
            definitive
          />
          <p data-testid="order-coupon">{current.snapshot.couponCode ?? ''}</p>
        </section>
      ) : (
        <p>Recibo indisponível.</p>
      )}
    </main>
  )
}
