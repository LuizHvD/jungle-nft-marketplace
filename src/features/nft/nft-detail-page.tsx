import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton.tsx'
import { NftPicture } from '@/components/ui/nft-picture.tsx'
import { useAddCartItem } from '@/features/cart/use-cart.ts'
import { CommerceStatus } from '@/features/commerce/status.tsx'
import { useFavorites, useToggleFavorite } from '@/features/favorites/use-favorites.ts'
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
      ? apiErrorMessage(toggleFavorite.error, 'Não foi possível atualizar o favorito.')
      : addToCart.isError
        ? apiErrorMessage(addToCart.error, 'Não foi possível adicionar ao carrinho.')
        : ''

  return (
    <main className="flex min-w-0 flex-col gap-[16px]">
      <NftPicture nftId={nft.id} alt={nft.name} loading="eager" />
      <h1>{nft.name}</h1>
      {selected ? (
        <EditionPicker
          editions={nft.editions}
          selectedId={selected.id}
          onSelect={(editionId) => {
            setSelectedId(editionId)
            const edition = nft.editions.find((item) => item.id === editionId)
            const nextSupply = edition?.availableSupply ?? 0
            setQuantityByEdition((current) => ({
              ...current,
              [editionId]: nextSupply > 0 ? 1 : 0,
            }))
          }}
        />
      ) : null}
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
      <CommerceStatus message={status} />
      <button
        type="button"
        aria-pressed={favorited}
        disabled={toggleFavorite.isPending}
        onClick={() => {
          if (!userId) {
            void navigate({
              to: '/login',
              search: { returnTo: `/nfts/${nft.id}` },
            })
            return
          }
          void toggleFavorite.mutateAsync({ nftId: nft.id, favorite: !favorited }).then(
            () => setNotice('Favorito atualizado.'),
            () => setNotice(''),
          )
        }}
      >
        {favorited ? 'Remover favorito' : 'Favoritar'}
      </button>
      <button
        type="button"
        disabled={supply === 0 || quantity < 1 || addToCart.isPending || !selected}
        aria-busy={addToCart.isPending}
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
        Compra
      </button>
      {others.length > 0 ? (
        <section
          aria-label="Related Products"
          className="flex flex-col gap-[16px]"
        >
          {others.map((item) => (
            <NftCard key={item.id} nft={item} loading="lazy" />
          ))}
        </section>
      ) : null}
    </main>
  )
}
