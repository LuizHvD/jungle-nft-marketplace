import {
  imageSlugForNft,
  nftImageSize,
  nftImageSizes,
  nftImageUrl,
  nftImageWidths,
  type NftImageSlug,
} from '@/features/catalog/nft-images.ts'

type NftPictureProps = {
  nftId: string
  alt: string
  loading: 'eager' | 'lazy'
}

function srcSet(slug: NftImageSlug, extension: 'avif' | 'webp'): string {
  return nftImageWidths
    .map((width) => `${nftImageUrl(slug, width, extension)} ${width}w`)
    .join(', ')
}

export function NftPicture({ nftId, alt, loading }: NftPictureProps) {
  const slug = imageSlugForNft(nftId)
  if (!slug) {
    return null
  }

  return (
    <picture>
      <source
        type="image/avif"
        srcSet={srcSet(slug, 'avif')}
        sizes={nftImageSizes}
      />
      <source
        type="image/webp"
        srcSet={srcSet(slug, 'webp')}
        sizes={nftImageSizes}
      />
      <img
        src={nftImageUrl(slug, nftImageSize, 'webp')}
        alt={alt}
        width={nftImageSize}
        height={nftImageSize}
        sizes={nftImageSizes}
        decoding="async"
        loading={loading}
        className="aspect-[960/960] h-auto w-full"
      />
    </picture>
  )
}
