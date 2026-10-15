import {
  initialSpikePrice,
  nextSpikePrice,
  spikeNftId,
  type SpikeNft,
} from '../contracts/spike-nft.ts'

export const spikeNft: SpikeNft = {
  id: spikeNftId,
  name: 'Spike NFT',
  price: initialSpikePrice,
  version: 1,
}

export function bumpSpikePrice(): SpikeNft {
  spikeNft.price = nextSpikePrice
  spikeNft.version += 1
  return spikeNft
}
