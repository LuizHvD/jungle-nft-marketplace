import { Link } from '@tanstack/react-router'

import type { Nft } from '@/contracts/nfts.ts'
import { NftPicture } from '@/components/ui/nft-picture.tsx'

import { isSoldOut, lowestEditionPrice } from './lowest-price.ts'

type NftCardProps = {
  nft: Nft
  loading: 'eager' | 'lazy'
}

export function NftCard({ nft, loading }: NftCardProps) {
  const price = lowestEditionPrice(nft)

  return (
    <article className="min-w-0">
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="flex min-w-0 flex-col gap-[8px]"
      >
        <NftPicture nftId={nft.id} alt={nft.name} loading={loading} />
        <span>{nft.name}</span>
        <span data-testid={`nft-card-price-${nft.id}`}>{price}</span>
        {isSoldOut(nft) ? <span>Esgotado</span> : null}
      </Link>
    </article>
  )
}
