import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { NftPicture } from '@/components/ui/nft-picture.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { formatEth } from '@/lib/format-eth.ts'
import { QuantityField } from '@/features/nft/quantity-field.tsx'
import { nftQueryOptions } from '@/features/nft/use-nft.ts'
import { CommerceStatus } from '@/features/commerce/status.tsx'
import {
  clearMergeFailed,
  readCouponDraft,
  readMergeFailed,
  writeCouponDraft,
} from '@/lib/commerce/checkout-draft.ts'
import { mergeGuestCart } from '@/lib/commerce/merge-guest-cart.ts'
import { apiErrorMessage } from '@/lib/http/error.ts'
import { readStoredToken } from '@/lib/session/storage.ts'
import { usePriceNotice } from '@/lib/realtime/price-notice.ts'
import { useSession } from '@/lib/session/session.ts'

import { MoneySummary } from './money-summary.tsx'
import {
  commerceActorId,
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from './use-cart.ts'
import { useQuote } from './use-quote.ts'

export function CartPage() {
  const session = useSession()
  const userId = session.data?.user.id ?? null
  const actorId = commerceActorId(userId)
  const cart = useCart(actorId)
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [couponInput, setCouponInput] = useState(() => readCouponDraft(actorId))
  const [appliedCoupon, setAppliedCoupon] = useState(() =>
    readCouponDraft(actorId),
  )
  const [mergeFailed, setMergeFailed] = useState(() => readMergeFailed())
  const [status, setStatus] = useState('')
  const priceNotice = usePriceNotice()
  const items = cart.data?.items ?? []
  const details = useQueries({
    queries: items.map((item) => nftQueryOptions(item.nftId)),
  })
  const lines = items.map((item) => ({
    nftId: item.nftId,
    editionId: item.editionId,
    quantity: item.quantity,
  }))
  const baseQuote = useQuote(
    actorId,
    items.length > 0 ? { items: lines } : null,
  )
  const couponQuote = useQuote(
    actorId,
    items.length > 0 && appliedCoupon
      ? { items: lines, couponCode: appliedCoupon }
      : null,
  )
  const quote = appliedCoupon ? couponQuote.data : baseQuote.data
  const quoteError = appliedCoupon ? couponQuote.error : baseQuote.error
  const busy =
    cart.isPending ||
    updateItem.isPending ||
    removeItem.isPending ||
    baseQuote.isFetching ||
    couponQuote.isFetching

  async function retryMerge() {
    const token = readStoredToken()
    if (!token) {
      return
    }
    const result = await mergeGuestCart(token)
    if (result === 'failed') {
      setStatus('Não foi possível unir o carrinho.')
      return
    }
    clearMergeFailed()
    setMergeFailed(false)
    await client.invalidateQueries({ queryKey: ['cart', actorId] })
    setStatus('Carrinho unido.')
  }

  return (
    <main className="flex flex-col gap-4 py-6 pb-28 md:pb-10">
      <h1 className="text-2xl font-bold">Carrinho de NFTs</h1>
      <CommerceStatus message={status || priceNotice} />
      {mergeFailed ? (
        <button type="button" onClick={() => void retryMerge()}>
          Unir carrinho
        </button>
      ) : null}
      {cart.isPending ? (
        <Skeleton data-testid="cart-skeleton" className="h-[45px] w-full" />
      ) : null}
      {cart.isError ? (
        <div>
          <p>
            {apiErrorMessage(
              cart.error,
              'Não foi possível carregar o carrinho.',
            )}
          </p>
          <button type="button" onClick={() => void cart.refetch()}>
            Tentar de novo
          </button>
        </div>
      ) : null}
      {cart.isSuccess && items.length === 0 ? <p>Carrinho vazio</p> : null}
      <ul className="flex flex-col gap-[8px]">
        {items.map((item, index) => {
          const nft = details[index]?.data
          const edition = nft?.editions.find(
            (entry) => entry.id === item.editionId,
          )
          const supply = edition?.availableSupply ?? item.quantity
          return (
            <li
              key={item.id}
              data-testid={`cart-line-${item.editionId}`}
              className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-xl bg-surface p-3"
            >
              <NftPicture
                nftId={item.nftId}
                alt=""
                loading="lazy"
                sizes="72px"
                className="rounded-lg"
              />
              <div className="flex min-w-0 flex-col gap-2">
                <p className="font-semibold">{nft?.name ?? item.nftId}</p>
                <p className="text-xs text-muted-foreground">{item.editionId}</p>
                <p className="font-bold text-brand">
                  {formatEth(item.lineTotal)}
                  <span
                    className="sr-only"
                    data-testid={`line-total-${item.editionId}`}
                  >
                    {item.lineTotal}
                  </span>
                </p>
              <QuantityField
                supply={supply}
                quantity={item.quantity}
                onChange={(quantity) => {
                  if (quantity === item.quantity) {
                    return
                  }
                  void updateItem
                    .mutateAsync({ id: item.id, quantity })
                    .catch((error: unknown) => {
                      setStatus(
                        apiErrorMessage(
                          error,
                          'Não foi possível alterar a quantidade.',
                        ),
                      )
                    })
                }}
              />
              <button
                type="button"
                onClick={() => {
                  void removeItem
                    .mutateAsync(item.id)
                    .catch((error: unknown) => {
                      setStatus(
                        apiErrorMessage(
                          error,
                          'Não foi possível remover o item.',
                        ),
                      )
                    })
                }}
              >
                Remover
              </button>
              </div>
            </li>
          )
        })}
      </ul>
      <form
        aria-label="Cupom"
        onSubmit={(event) => {
          event.preventDefault()
          const next = couponInput.trim()
          writeCouponDraft(actorId, next)
          setAppliedCoupon(next)
          setStatus('')
        }}
      >
        <label htmlFor="coupon-code">Cupom</label>
        <input
          id="coupon-code"
          value={couponInput}
          onChange={(event) => setCouponInput(event.target.value)}
        />
        <button type="submit">Aplicar</button>
        <button
          type="button"
          onClick={() => {
            setCouponInput('')
            setAppliedCoupon('')
            writeCouponDraft(actorId, '')
            setStatus('Cupom removido.')
          }}
        >
          Remover cupom
        </button>
      </form>
      {items.length > 0 && !quote && !quoteError ? (
        <Skeleton
          data-testid="cart-summary-skeleton"
          className="h-[45px] w-full"
        />
      ) : null}
      {quoteError ? (
        <p role="alert">
          {apiErrorMessage(quoteError, 'Cotação indisponível.')}
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
      {items.length > 0 ? (
        <button
          type="button"
          disabled={busy}
          className="h-12 w-full rounded-full bg-primary text-base font-semibold text-ink hover:bg-primary/85 disabled:cursor-not-allowed md:w-auto md:px-8"
          onClick={() => {
            if (userId) {
              void navigate({ to: '/checkout', search: { step: 'dados' } })
              return
            }
            void navigate({ to: '/login', search: { returnTo: '/checkout' } })
          }}
        >
          Conectar e finalizar
        </button>
      ) : null}
    </main>
  )
}
