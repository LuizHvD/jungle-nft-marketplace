import { describe, expect, it } from 'vitest'
import { mergeCartLines } from './cart-merge.ts'

describe('merge de carrinho', () => {
  it('soma a mesma edição e limita ao estoque', () => {
    const merged = mergeCartLines(
      [{ nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 3 }],
      [{ nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 3 }],
      () => 4,
    )

    expect(merged).toEqual([
      { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 4 },
    ])
  })
})
