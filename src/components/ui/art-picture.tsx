import {
  nftImageSize,
  nftImageUrl,
  nftImageWidths,
  type ArtSlug,
} from '@/features/catalog/nft-images.ts'

import { cn } from '@/lib/utils'

type ArtPictureProps = {
  slug: ArtSlug
  alt: string
  loading: 'eager' | 'lazy'
  className?: string
  sizes?: string
}

function srcSet(slug: ArtSlug, extension: 'avif' | 'webp'): string {
  return nftImageWidths
    .map((width) => `${nftImageUrl(slug, width, extension)} ${width}w`)
    .join(', ')
}

export function ArtPicture({
  slug,
  alt,
  loading,
  className,
  sizes = '100vw',
}: ArtPictureProps) {
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
