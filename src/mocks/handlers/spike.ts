import { http, HttpResponse } from 'msw'
import { publishSpikePrice, socketHandlers } from '../sockets.ts'
import { bumpSpikePrice, spikeNft } from '../spike-state.ts'

export const spikeHandlers = [
  http.get('/api/spike/nft', () => {
    return HttpResponse.json(spikeNft)
  }),
  http.post('/api/spike/nft/price', () => {
    bumpSpikePrice()
    publishSpikePrice()
    return new HttpResponse(null, { status: 204 })
  }),
  ...socketHandlers,
]
