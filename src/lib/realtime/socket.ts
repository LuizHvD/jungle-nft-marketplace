import { io, type Socket } from 'socket.io-client'

export function createSpikeSocket(): Socket {
  return io(window.location.origin, {
    transports: ['websocket'],
    path: '/socket.io/',
  })
}
