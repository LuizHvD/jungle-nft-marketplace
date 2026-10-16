import { describe, expect, it } from 'vitest'
import type { NftUpdatedEvent as SpikeEvent } from './spike-nft.ts'
import { nftUpdatedEventSchema } from './events.ts'

describe('nft.updated', () => {
  it('aceita o payload do spike e o do catálogo', () => {
    const spike: SpikeEvent = {
      eventId: 'event-1',
      nftId: 'spike-nft',
      version: 2,
      price: '2.750000000000000000',
    }
    const catalog = {
      ...spike,
      nftId: 'nft-aurora',
      editionId: 'edition-aurora-1',
      availableSupply: 4,
    }

    expect(nftUpdatedEventSchema.safeParse(spike).success).toBe(true)
    expect(nftUpdatedEventSchema.safeParse(catalog).success).toBe(true)
  })
})
