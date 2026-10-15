import { toSocketIo } from '@mswjs/socket.io-binding'
import { http, HttpResponse, ws, type WebSocketHandlerConnection } from 'msw'
import type { NftUpdatedEvent } from '../contracts/spike-nft.ts'
import { bumpSpikePrice, spikeNft } from './spike-state.ts'

const sockets = new Set<ReturnType<typeof toSocketIo>>()

function rememberSocket(connection: WebSocketHandlerConnection): void {
  const io = toSocketIo(connection)
  sockets.add(io)
  connection.client.addEventListener('close', () => {
    sockets.delete(io)
  })
}

// O MSW 2.15 apaga `/socket.io/` antes de comparar a URL, então um matcher
// só desse caminho também captura o HMR e qualquer outro socket na mesma
// origem. O link fica amplo de propósito: só a URL com `socket.io` entra no
// binding. As demais são devolvidas ao servidor original.
const socketHandlers = [
  ws.link('*').addEventListener('connection', (connection) => {
    if (!String(connection.client.url).includes('socket.io')) {
      connection.server.connect()
      return
    }

    rememberSocket(connection)
  }),
]

function publishPrice(): void {
  const event: NftUpdatedEvent = {
    eventId: crypto.randomUUID(),
    nftId: spikeNft.id,
    version: spikeNft.version,
    price: spikeNft.price,
  }

  for (const io of sockets) {
    io.client.emit('nft.updated', event)
  }
}

export const handlers = [
  http.get('/api/spike/nft', () => {
    return HttpResponse.json(spikeNft)
  }),
  http.post('/api/spike/nft/price', () => {
    bumpSpikePrice()
    publishPrice()
    return new HttpResponse(null, { status: 204 })
  }),
  ...socketHandlers,
]
