import {
  imageSlugForNft,
  nftImageSize,
  nftImageSizes,
  nftImageUrl,
  nftImageWidths,
  type NftImageSlug,
} from '@/features/catalog/nft-images.ts'

import { cn } from '@/lib/utils'

type NftPictureProps = {
  nftId: string
  alt: string
  loading: 'eager' | 'lazy'
  className?: string
  sizes?: string
}

function srcSet(slug: NftImageSlug, extension: 'avif' | 'webp'): string {
  return nftImageWidths
    .map((width) => `${nftImageUrl(slug, width, extension)} ${width}w`)
    .join(', ')
}

export function NftPicture({
  nftId,
  alt,
  loading,
  className,
  sizes = nftImageSizes,
}: NftPictureProps) {
  const slug = imageSlugForNft(nftId)
  if (!slug) {
    return null
  }

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet(slug, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(slug, 'webp')} sizes={sizes} />
      <img
        src={nftImageUrl(slug, nftImageSize, 'webp')}
        alt={alt}
        width={nftImageSize}
        height={nftImageSize}
        sizes={sizes}
        decoding="async"
        loading={loading}
        className={cn('aspect-square h-auto w-full object-cover', className)}
      />
    </picture>
  )
}
