import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { NftUpdatedEvent as CatalogNftUpdated } from '../contracts/events.ts'
import type { NftUpdatedEvent } from '../contracts/spike-nft.ts'
import type { OrderStatus } from '../domain/events.ts'
import { spikeNft } from './spike-state.ts'
import { withState } from './store.ts'

export const socketLink = ws.link('*')

const spikeSockets = new Set<ReturnType<typeof toSocketIo>>()

// O MSW 2.15 apaga `/socket.io/` antes de comparar a URL, então um matcher
// só desse caminho também captura o HMR e qualquer outro socket na mesma
// origem. O link fica amplo de propósito: só a URL com `socket.io` entra no
// binding. As demais são devolvidas ao servidor original.

export function publishSpikePrice(): void {
  const event: NftUpdatedEvent = {
    eventId: crypto.randomUUID(),
    nftId: spikeNft.id,
    version: spikeNft.version,
    price: spikeNft.price,
  }

  for (const io of spikeSockets) {
    io.client.emit('nft.updated', event)
  }
}

export const socketHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    if (!String(connection.client.url).includes('socket.io')) {
      connection.server.connect()
      return
    }

    const io = toSocketIo(connection)
    spikeSockets.add(io)
    connection.client.addEventListener('close', () => {
      spikeSockets.delete(io)
    })
  }),
]

export function encodeSocketIoEvent(event: string, data: unknown): string {
  return `42${JSON.stringify([event, data])}`
}

export async function emitSocketEvent(
  event: string,
  data: unknown,
  accept: (url: URL) => boolean,
): Promise<void> {
  const frame = encodeSocketIoEvent(event, data)
  for (const client of socketLink.clients) {
    const url =
      client.url instanceof URL ? client.url : new URL(String(client.url))
    if (!url.href.includes('socket.io')) {
      continue
    }
    if (!accept(url)) {
      continue
    }
    client.send(frame)
  }
}

export async function emitNftUpdated(event: CatalogNftUpdated): Promise<void> {
  await emitSocketEvent('nft.updated', event, () => true)
}

export async function emitOrderUpdated(order: {
  id: string
  actorId: string
  version: number
  status: OrderStatus
}): Promise<void> {
  const tokens = await withState((state) => ({
    state,
    result: state.sessions
      .filter(
        (session) =>
          session.userId === order.actorId &&
          Date.parse(session.expiresAt) > Date.parse(state.clock),
      )
      .map((session) => session.token),
  }))
  const allowed = new Set(tokens)
  await emitSocketEvent(
    'order.updated',
    {
      eventId: crypto.randomUUID(),
      orderId: order.id,
      version: order.version,
      status: order.status,
    },
    (url) => {
      const token = url.searchParams.get('token')
      return token !== null && allowed.has(token)
    },
  )
}
