export const spikeNftId = 'spike-nft'
export const initialSpikePrice = '1.500000000000000000'
export const nextSpikePrice = '2.750000000000000000'

export type SpikeNft = {
  id: typeof spikeNftId
  name: string
  price: string
  version: number
}

export type NftUpdatedEvent = {
  eventId: string
  nftId: string
  version: number
  price: string
}
