import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'

import { walletSchema } from '@/contracts/wallets.ts'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { MoneySummary } from '@/features/cart/money-summary.tsx'
import { commerceActorId, useCart } from '@/features/cart/use-cart.ts'
import { useQuote } from '@/features/cart/use-quote.ts'
import { CommerceStatus } from '@/features/commerce/status.tsx'
import { useWallets } from '@/features/wallets/use-wallets.ts'
import {
  readCheckoutDraft,
  readCouponDraft,
  writeCheckoutDraft,
  type CheckoutNetwork,
  type CheckoutStep,
} from '@/lib/commerce/checkout-draft.ts'
import {
  pendingOrderRetry,
  prepareOrderAttempt,
} from '@/lib/commerce/order-attempt.ts'
import { confirmAllowed } from '@/lib/commerce/quote-guard.ts'
import { http } from '@/lib/http/client.ts'
import {
  apiErrorCode,
  apiErrorMessage,
  isAbortError,
} from '@/lib/http/error.ts'
import { commitOwnedWallet, readActorStamp } from '@/lib/session/owned-cache.ts'
import { usePriceNotice } from '@/lib/realtime/price-notice.ts'
import { useSession } from '@/lib/session/session.ts'
import {
  storedPlaceInput,
  usePlaceOrder,
} from '@/features/orders/use-place-order.ts'

const networks: CheckoutNetwork[] = ['demo-mainnet', 'demo-l2']

export function CheckoutPage() {
  const session = useSession()
  const userId = session.data?.user.id
  const actorId = commerceActorId(userId)
  const search = useSearch({ strict: false })
  const step: CheckoutStep = search.step === 'revisao' ? 'revisao' : 'dados'
  const navigate = useNavigate()
  const client = useQueryClient()
  const wallets = useWallets(userId)
  const cart = useCart(actorId)
  const place = usePlaceOrder()
  const draft = userId ? readCheckoutDraft(userId) : null
  const [walletId, setWalletId] = useState(draft?.walletId ?? '')
  const [network, setNetwork] = useState<CheckoutNetwork>(
    draft?.network ?? 'demo-mainnet',
  )
  const [notice, setNotice] = useState('')
  const priceNotice = usePriceNotice()
  const [rejectedQuoteId, setRejectedQuoteId] = useState<string | null>(null)
  const list = wallets.data?.wallets ?? []
  const resolvedWalletId = walletId || list[0]?.id || ''
  const wallet = list.find((item) => item.id === resolvedWalletId) ?? null
  const items = (cart.data?.items ?? []).map((item) => ({
    nftId: item.nftId,
    editionId: item.editionId,
    quantity: item.quantity,
  }))
  const coupon = userId ? readCouponDraft(userId) : ''
  const finalQuote = useQuote(
    actorId,
    step === 'revisao' && resolvedWalletId && items.length > 0
      ? {
          items,
          couponCode: coupon || undefined,
          walletId: resolvedWalletId,
          network,
          connection: wallet?.connection.status,
        }
      : null,
  )
  const quote = finalQuote.data
  const connected =
    wallet?.connection.status === 'connected' &&
    wallet.connection.network === network
  const pending = userId ? pendingOrderRetry(userId) : null
  const canConfirm = confirmAllowed({
    step,
    definitive: quote?.definitive === true,
    connected,
    fetching: finalQuote.isFetching || finalQuote.isPending,
    quoteId: quote?.quoteId ?? null,
    rejectedQuoteId,
    pendingAttempt: Boolean(pending),
  })

  function persist(
    nextStep: CheckoutStep,
    nextWallet: string,
    nextNetwork: CheckoutNetwork,
  ) {
    if (!userId) {
      return
    }
    writeCheckoutDraft({
      userId,
      walletId: nextWallet,
      network: nextNetwork,
      step: nextStep,
    })
  }

  const connect = useMutation({
    retry: false,
    mutationFn: async () => {
      const stamp = readActorStamp()
      const response = await http.post(
        `/wallets/${resolvedWalletId}/connection`,
        {
          network,
          action: 'connect',
        },
      )
      return { wallet: walletSchema.parse(response.data), stamp }
    },
    onSuccess: ({ wallet: next, stamp }) => {
      if (!stamp || !commitOwnedWallet(client, stamp, next)) {
        return
      }
    },
  })

  async function confirm(input: {
    quoteId: string
    expectedTotal: string
    key: string
  }) {
    if (!userId) {
      return
    }
    setNotice('')
    try {
      await place.mutateAsync({ userId, ...input })
    } catch (error) {
      if (apiErrorCode(error) === 'QUOTE_STALE') {
        if (quote?.quoteId) {
          setRejectedQuoteId(quote.quoteId)
        }
        void client.invalidateQueries({ queryKey: ['quote', actorId] })
      }
      setNotice('')
    }
  }

  const retryable =
    Boolean(pending) || notice === 'Retome a tentativa anterior.'
  const status = place.isError
    ? isAbortError(place.error)
      ? 'A resposta não chegou. Tentar de novo.'
      : apiErrorMessage(place.error, 'Não foi possível criar o pedido.')
    : notice || priceNotice

  return (
    <main className="flex flex-col gap-[4px] min-[1440px]:gap-[96px]">
      <h1>Checkout</h1>
      <p data-testid="checkout-step">{step}</p>
      <p data-testid="quote-state">{canConfirm ? 'ready' : 'blocked'}</p>
      <p data-testid="quote-id">{quote?.quoteId ?? ''}</p>
      <CommerceStatus message={status} />
      {pending ? (
        <section data-testid="pending-attempt">
          <p>Tentativa pendente</p>
          <p data-testid="pending-key">{pending.key}</p>
          <p data-testid="pending-quote">{pending.quoteId}</p>
          <p data-testid="pending-total">{pending.expectedTotal}</p>
        </section>
      ) : null}
      {wallets.isPending || cart.isPending ? (
        <Skeleton data-testid="checkout-skeleton" className="h-[45px] w-full" />
      ) : null}
      <label htmlFor="checkout-wallet">Carteira</label>
      <select
        id="checkout-wallet"
        value={resolvedWalletId}
        onChange={(event) => {
          setWalletId(event.target.value)
          persist(step, event.target.value, network)
        }}
      >
        {list.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <label htmlFor="checkout-network">Rede</label>
      <select
        id="checkout-network"
        value={network}
        onChange={(event) => {
          const next = event.target.value as CheckoutNetwork
          setNetwork(next)
          persist(step, resolvedWalletId, next)
        }}
      >
        {networks.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <p data-testid="wallet-connection">
        {wallet
          ? `${wallet.connection.status} ${wallet.connection.network ?? ''}`
          : 'sem carteira'}
      </p>
      {connected ? null : (
        <button
          type="button"
          disabled={!resolvedWalletId || connect.isPending}
          onClick={() => void connect.mutateAsync().catch(() => undefined)}
        >
          Conectar carteira
        </button>
      )}
      {step === 'dados' ? (
        <button
          type="button"
          disabled={items.length === 0}
          onClick={() => {
            persist('revisao', resolvedWalletId, network)
            void navigate({ to: '/checkout', search: { step: 'revisao' } })
          }}
        >
          Continuar
        </button>
      ) : null}
      {finalQuote.isError ? (
        <p role="alert">
          {apiErrorMessage(finalQuote.error, 'Cotação indisponível.')}
        </p>
      ) : null}
      {quote ? (
        <MoneySummary
          subtotal={quote.subtotal}
          discount={quote.discount}
          fee={quote.fee}
          total={quote.total}
          definitive={quote.definitive}
        />
      ) : null}
      {canConfirm && quote ? (
        <button
          type="button"
          aria-busy={place.isPending}
          disabled={place.isPending}
          onClick={() => {
            if (!userId) {
              return
            }
            const prepared = prepareOrderAttempt({
              userId,
              quoteId: quote.quoteId,
              expectedTotal: quote.total,
            })
            if (prepared.blocked) {
              setNotice('Retome a tentativa anterior.')
              return
            }
            void confirm({
              quoteId: prepared.attempt.quoteId,
              expectedTotal: prepared.attempt.expectedTotal,
              key: prepared.attempt.key,
            })
          }}
        >
          Confirm Button
        </button>
      ) : null}
      {retryable ? (
        <button
          type="button"
          disabled={place.isPending}
          onClick={() => {
            if (!userId) {
              return
            }
            const stored = storedPlaceInput(userId)
            if (!stored) {
              return
            }
            void confirm(stored)
          }}
        >
          Tentar de novo
        </button>
      ) : null}
    </main>
  )
}
