export const nftImageWidths = [160, 320, 640, 960] as const

export const nftImageSize = 960

export const nftImageSizes =
  '(min-width: 1440px) calc((1200px - 240px - 16px - 32px) / 3), (min-width: 768px) calc((100vw - 48px - 16px) / 2), calc(100vw - 48px)'

const nftImageSlug = {
  'nft-aurora': 'emerald',
  'nft-moss': 'golden',
  'nft-sold': 'ivory',
} as const

export type NftImageSlug = (typeof nftImageSlug)[keyof typeof nftImageSlug]

export function imageSlugForNft(id: string): NftImageSlug | undefined {
  if (id === 'nft-aurora' || id === 'nft-moss' || id === 'nft-sold') {
    return nftImageSlug[id]
  }
  return undefined
}

export function nftImageUrl(
  slug: NftImageSlug,
  width: (typeof nftImageWidths)[number],
  extension: 'avif' | 'webp',
): string {
  return `/images/nfts/${slug}-${width}.${extension}`
}
