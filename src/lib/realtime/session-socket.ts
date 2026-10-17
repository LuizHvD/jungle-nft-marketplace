import type { QueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'

import {
  applyNftUpdated,
  applyOrderUpdated,
  refetchRealtime,
} from './apply-realtime.ts'
import { clearPriceNotice } from './price-notice.ts'

type AppSocketControls = {
  drop: () => void
  restore: () => void
}

declare global {
  interface Window {
    __jungleAppSocket?: AppSocketControls
  }
}

let socket: Socket | null = null
let activeToken: string | null = null
let boundClient: QueryClient | null = null
const seenEventIds = new Set<string>()

function setSessionDataset(token: string | null): void {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.dataset.sessionSocket = token ? 'open' : 'closed'
}

function setAppDataset(state: 'open' | 'closed'): void {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.dataset.appSocket = state
}

function closeSocket(): void {
  seenEventIds.clear()
  clearPriceNotice()
  activeToken = null
  boundClient = null
  if (socket) {
    const current = socket
    socket = null
    current.removeAllListeners()
    current.disconnect()
  }
  setSessionDataset(null)
  setAppDataset('closed')
  if (typeof window !== 'undefined') {
    delete window.__jungleAppSocket
  }
}

export function readActiveToken(): string | null {
  return activeToken
}

export function disconnectSessionSocket(): void {
  closeSocket()
}

export function connectSessionSocket(
  token: string | null,
  client: QueryClient,
): void {
  if (typeof window === 'undefined') {
    return
  }
  if (socket && activeToken === token && boundClient === client) {
    return
  }
  closeSocket()
  activeToken = token
  boundClient = client
  let opened = false
  const captured = token
  const current = io(window.location.origin, {
    path: '/socket.io/',
    transports: ['websocket'],
    reconnection: true,
    ...(token ? { query: { token } } : {}),
  })
  socket = current
  setSessionDataset(token)
  current.on('connect', () => {
    if (socket !== current || activeToken !== captured) {
      return
    }
    setAppDataset('open')
    if (opened) {
      if (boundClient) {
        refetchRealtime(boundClient, captured)
      }
      return
    }
    opened = true
  })
  current.on('disconnect', () => {
    if (socket !== current) {
      return
    }
    setAppDataset('closed')
  })
  current.on('nft.updated', (payload: unknown) => {
    if (socket !== current || activeToken !== captured || !boundClient) {
      return
    }
    void applyNftUpdated(boundClient, payload, seenEventIds)
  })
  current.on('order.updated', (payload: unknown) => {
    if (
      captured === null ||
      socket !== current ||
      activeToken !== captured ||
      !boundClient
    ) {
      return
    }
    void applyOrderUpdated(boundClient, payload, seenEventIds, captured)
  })
  window.__jungleAppSocket = {
    drop: () => {
      current.disconnect()
    },
    restore: () => {
      current.connect()
    },
  }
}
