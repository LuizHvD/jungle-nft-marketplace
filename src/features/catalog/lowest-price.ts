import type { Nft } from '@/contracts/nfts.ts'
import { parseDecimalToWei } from '@/domain/money.ts'

export function lowestEditionPrice(nft: Nft): string {
  const first = nft.editions[0]
  if (!first) {
    return ''
  }

  return nft.editions.reduce((lowest, edition) => {
    if (parseDecimalToWei(edition.price) < parseDecimalToWei(lowest)) {
      return edition.price
    }
    return lowest
  }, first.price)
}

export function isSoldOut(nft: Nft): boolean {
  if (nft.editions.length === 0) {
    return true
  }
  return nft.editions.every((edition) => edition.availableSupply === 0)
}
