import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton.tsx'
import { NftPicture } from '@/components/ui/nft-picture.tsx'
import { formatEth } from '@/lib/format-eth.ts'
import { useAddCartItem } from '@/features/cart/use-cart.ts'
import { CommerceStatus } from '@/features/commerce/status.tsx'
import {
  useFavorites,
  useToggleFavorite,
} from '@/features/favorites/use-favorites.ts'
import { apiErrorMessage, isNotFoundError } from '@/lib/http/error.ts'
import { useSession } from '@/lib/session/session.ts'

import { NftCard } from '@/features/catalog/nft-card.tsx'
import { useCatalog } from '@/features/catalog/use-catalog.ts'

import { EditionPicker } from './edition-picker.tsx'
import { QuantityField } from './quantity-field.tsx'
import { useNft } from './use-nft.ts'

type NftDetailPageProps = {
  nftId: string
}

export function NftDetailPage({ nftId }: NftDetailPageProps) {
  const nftQuery = useNft(nftId)
  const relatedQuery = useCatalog({})
  const session = useSession()
  const userId = session.data?.user.id
  const favorites = useFavorites(userId)
  const toggleFavorite = useToggleFavorite(userId)
  const addToCart = useAddCartItem()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')
  const [quantityByEdition, setQuantityByEdition] = useState<
    Record<string, number>
  >({})
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  if (nftQuery.isPending) {
    return (
      <main aria-busy="true">
        <h1>Detalhe</h1>
        <Skeleton
          data-testid="nft-detail-skeleton"
          className="aspect-[960/960] w-full"
        />
        <Skeleton className="mt-[8px] h-[45px] w-full" />
      </main>
    )
  }

  if (nftQuery.isError && isNotFoundError(nftQuery.error)) {
    return (
      <main>
        <h1>{apiErrorMessage(nftQuery.error, 'NFT não encontrado.')}</h1>
      </main>
    )
  }

  if (nftQuery.isError) {
    return (
      <main>
        <p>
          {apiErrorMessage(nftQuery.error, 'Não foi possível carregar o NFT.')}
        </p>
        <button type="button" onClick={() => void nftQuery.refetch()}>
          Tentar de novo
        </button>
      </main>
    )
  }

  const nft = nftQuery.data
  const selected =
    nft.editions.find((edition) => edition.id === selectedId) ?? nft.editions[0]
  const supply = selected?.availableSupply ?? 0
  const storedQuantity = selected ? quantityByEdition[selected.id] : undefined
  const quantity =
    storedQuantity === undefined ? (supply > 0 ? 1 : 0) : storedQuantity
  const others =
    relatedQuery.data?.items.filter((item) => item.id !== nft.id) ?? []
  const favorited = favorites.data?.nftIds.includes(nft.id) ?? false
  const status = notice
    ? notice
    : toggleFavorite.isError
      ? apiErrorMessage(
          toggleFavorite.error,
          'Não foi possível atualizar o favorito.',
        )
      : addToCart.isError
        ? apiErrorMessage(
            addToCart.error,
            'Não foi possível adicionar ao carrinho.',
          )
        : ''

  return (
    <main className="flex min-w-0 flex-col gap-8 py-6 pb-40 md:pb-10">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <NftPicture
          nftId={nft.id}
          alt={nft.name}
          loading="eager"
          className="rounded-3xl bg-surface"
        />
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold md:text-4xl">{nft.name}</h1>
          {selected ? (
            <p className="text-2xl font-bold text-brand">
              {formatEth(selected.price)}
            </p>
          ) : null}
          {selected ? (
            <EditionPicker
              editions={nft.editions}
              selectedId={selected.id}
              onSelect={(editionId) => {
                setSelectedId(editionId)
                const edition = nft.editions.find(
                  (item) => item.id === editionId,
                )
                const nextSupply = edition?.availableSupply ?? 0
                setQuantityByEdition((current) => ({
                  ...current,
                  [editionId]: nextSupply > 0 ? 1 : 0,
                }))
              }}
            />
          ) : null}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Qtd.</span>
            <QuantityField
              supply={supply}
              quantity={quantity}
              onChange={(next) => {
                if (selected) {
                  setQuantityByEdition((current) => ({
                    ...current,
                    [selected.id]: next,
                  }))
                }
              }}
            />
          </div>
          <CommerceStatus message={status} />
          <div className="fixed inset-x-0 bottom-36 z-30 flex items-center gap-3 bg-background/95 px-6 py-3 md:static md:bg-transparent md:px-0">
            <button
              type="button"
              disabled={
                supply === 0 || quantity < 1 || addToCart.isPending || !selected
              }
              aria-busy={addToCart.isPending}
              className="h-12 flex-1 rounded-full bg-primary text-base font-semibold text-ink hover:bg-primary/85 disabled:opacity-50"
              onClick={() => {
                if (!selected || quantity < 1) {
                  return
                }
                void addToCart
                  .mutateAsync({
                    nftId: nft.id,
                    editionId: selected.id,
                    quantity,
                  })
                  .then(
                    () => setNotice('Adicionado ao carrinho.'),
                    () => setNotice(''),
                  )
              }}
            >
              Comprar NFT
            </button>
            <button
              type="button"
              aria-pressed={favorited}
              disabled={toggleFavorite.isPending}
              className="h-12 rounded-full border border-border px-4 text-sm"
              onClick={() => {
                if (!userId) {
                  void navigate({
                    to: '/login',
                    search: { returnTo: `/nfts/${nft.id}` },
                  })
                  return
                }
                void toggleFavorite
                  .mutateAsync({ nftId: nft.id, favorite: !favorited })
                  .then(
                    () => setNotice('Favorito atualizado.'),
                    () => setNotice(''),
                  )
              }}
            >
              {favorited ? 'Remover favorito' : 'Favoritar'}
            </button>
          </div>
        </div>
      </div>
      {others.length > 0 ? (
        <section
          aria-label="Related Products"
          className="grid grid-cols-2 gap-4 lg:grid-cols-3"
        >
          <h2 className="col-span-full text-xl font-bold">
            Mais desta coleção
          </h2>
          {others.map((item) => (
            <NftCard key={item.id} nft={item} loading="lazy" />
          ))}
        </section>
      ) : null}
    </main>
  )
}
