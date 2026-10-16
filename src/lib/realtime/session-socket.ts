import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null
let activeToken: string | null = null

export function connectSessionSocket(token: string): void {
  if (typeof window === 'undefined') {
    return
  }
  if (socket && activeToken === token) {
    return
  }
  disconnectSessionSocket()
  activeToken = token
  socket = io(window.location.origin, {
    path: '/socket.io/',
    transports: ['websocket'],
    query: { token },
  })
  document.documentElement.dataset.sessionSocket = 'open'
}

export function disconnectSessionSocket(): void {
  activeToken = null
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.sessionSocket = 'closed'
  }
}
