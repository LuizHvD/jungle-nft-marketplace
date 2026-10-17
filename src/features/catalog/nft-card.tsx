import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'

import type { Nft } from '@/contracts/nfts.ts'
import { NftPicture } from '@/components/ui/nft-picture.tsx'
import { formatEth } from '@/lib/format-eth.ts'
import { cn } from '@/lib/utils.ts'

import { isSoldOut, lowestEditionPrice } from './lowest-price.ts'

type NftCardProps = {
  nft: Nft
  loading: 'eager' | 'lazy'
  favorite?: boolean
  onToggleFavorite?: () => void
}

const cardSizes = '(min-width: 1280px) 250px, (min-width: 768px) 30vw, 45vw'

export function NftCard({
  nft,
  loading,
  favorite = false,
  onToggleFavorite,
}: NftCardProps) {
  const price = lowestEditionPrice(nft)

  return (
    <article className="group relative flex min-w-0 flex-col gap-3">
      <div className="relative rounded-2xl bg-surface p-1 pb-6 md:rounded-none md:px-1 md:py-[25px]">
        <NftPicture
          nftId={nft.id}
          alt={nft.name}
          loading={loading}
          sizes={cardSizes}
          className="rounded-xl transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
        />
        {onToggleFavorite ? (
          <button
            type="button"
            aria-pressed={favorite}
            aria-label={
              favorite
                ? `Remover ${nft.name} dos favoritos`
                : `Adicionar ${nft.name} aos favoritos`
            }
            className="absolute top-3 right-3 z-10 flex size-[30px] items-center justify-center rounded-full bg-[#2f1d15] text-primary"
            onClick={onToggleFavorite}
          >
            <Heart
              className={cn('size-4', favorite && 'fill-current')}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-2 md:px-0">
        <h2 className="text-[15px] leading-5 md:text-base">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="after:absolute after:inset-0"
          >
            <span>{nft.name}</span>
            {isSoldOut(nft) ? (
              <span className="mt-1 block text-sm font-normal text-muted-foreground">
                Esgotado
              </span>
            ) : null}
          </Link>
        </h2>
        <p
          data-testid={`nft-card-price-${nft.id}`}
          className="text-[15px] font-bold text-brand md:text-[17px]"
        >
          {formatEth(price)}
        </p>
      </div>
    </article>
  )
}
