import type { Query, QueryClient } from '@tanstack/react-query'

import type { SessionResponse } from '@/contracts/auth.ts'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type NftUpdatedEvent,
} from '@/contracts/events.ts'
import type { Nft, NftPage } from '@/contracts/nfts.ts'
import type { OrderResponse } from '@/contracts/orders.ts'
import { acceptsOrderStatus } from '@/domain/events.ts'
import { sessionQueryKey } from '@/lib/session/private-cache.ts'

import { publishPriceNotice } from './price-notice.ts'

function isNft(value: unknown): value is Nft {
  if (!value || typeof value !== 'object') {
    return false
  }
  const nft = value as Nft
  return (
    typeof nft.id === 'string' &&
    typeof nft.version === 'number' &&
    Array.isArray(nft.editions)
  )
}

function isNftPage(value: unknown): value is NftPage {
  if (!value || typeof value !== 'object' || !('items' in value)) {
    return false
  }
  const items = (value as NftPage).items
  return Array.isArray(items) && items.every((item) => isNft(item))
}

function isOrder(value: unknown): value is OrderResponse {
  if (!value || typeof value !== 'object') {
    return false
  }
  const order = value as OrderResponse
  return (
    typeof order.id === 'string' &&
    typeof order.version === 'number' &&
    typeof order.status === 'string'
  )
}

export function shareNftData(current: unknown, incoming: unknown): unknown {
  if (!isNft(incoming)) {
    return incoming
  }
  if (!isNft(current)) {
    return incoming
  }
  return shareNft(current, incoming)
}

export function shareNft(current: Nft | undefined, incoming: Nft): Nft {
  if (!current || current.id !== incoming.id) {
    return incoming
  }
  if (incoming.version > current.version) {
    return incoming
  }
  if (incoming.version < current.version) {
    return current
  }
  return incoming
}

export function shareNftPageData(current: unknown, incoming: unknown): unknown {
  if (!isNftPage(incoming)) {
    return incoming
  }
  if (!isNftPage(current)) {
    return incoming
  }
  return shareNftPage(current, incoming)
}

export function shareNftPage(
  current: NftPage | undefined,
  incoming: NftPage,
): NftPage {
  if (!current) {
    return incoming
  }
  const previous = new Map(current.items.map((item) => [item.id, item]))
  const items = incoming.items.map((item) =>
    shareNft(previous.get(item.id), item),
  )
  const changed = items.some((item, index) => item !== incoming.items[index])
  if (changed) {
    return { ...incoming, items }
  }
  return incoming
}

export function shareOrderData(current: unknown, incoming: unknown): unknown {
  if (!isOrder(incoming)) {
    return incoming
  }
  if (!isOrder(current)) {
    return incoming
  }
  return shareOrder(current, incoming)
}

export function shareOrder(
  current: OrderResponse | undefined,
  incoming: OrderResponse,
): OrderResponse {
  if (!current || current.id !== incoming.id) {
    return incoming
  }
  if (incoming.version < current.version) {
    return current
  }
  if (acceptsOrderStatus(current.status, incoming.status)) {
    return incoming
  }
  return current
}

type NftWrite = 'keep' | 'refetch' | Nft

function nextNft(nft: Nft, event: NftUpdatedEvent): NftWrite {
  if (nft.id !== event.nftId || event.version <= nft.version) {
    return 'keep'
  }
  const editionId = event.editionId
  const edition = editionId
    ? nft.editions.find((item) => item.id === editionId)
    : undefined
  if (!editionId || !edition) {
    return 'refetch'
  }
  const availableSupply = event.availableSupply ?? edition.availableSupply
  return {
    ...nft,
    version: event.version,
    editions: nft.editions.map((item) =>
      item.id === editionId
        ? { ...item, price: event.price, availableSupply }
        : item,
    ),
  }
}

function commitNft(
  client: QueryClient,
  queryKey: readonly unknown[],
  event: NftUpdatedEvent,
): 'patched' | 'refetch' | 'keep' {
  let outcome: 'patched' | 'refetch' | 'keep' = 'keep'
  client.setQueryData(queryKey, (current: unknown) => {
    if (isNft(current)) {
      const next = nextNft(current, event)
      if (next === 'keep' || next === 'refetch') {
        outcome = next
        return current
      }
      outcome = 'patched'
      return next
    }
    if (!isNftPage(current)) {
      return current
    }
    let patched = false
    let refetch = false
    const items = current.items.map((item) => {
      if (item.id !== event.nftId) {
        return item
      }
      const next = nextNft(item, event)
      if (next === 'keep') {
        return item
      }
      if (next === 'refetch') {
        refetch = true
        return item
      }
      patched = true
      return next
    })
    if (patched) {
      outcome = 'patched'
      return { ...current, items }
    }
    outcome = refetch ? 'refetch' : 'keep'
    return current
  })
  return outcome
}

function sessionForToken(
  client: QueryClient,
  token: string,
): SessionResponse | null {
  const session = client.getQueryData<SessionResponse>(sessionQueryKey)
  if (!session || session.token !== token) {
    return null
  }
  return session
}

function commitOrder(
  client: QueryClient,
  queryKey: readonly unknown[],
  event: { orderId: string; version: number; status: OrderResponse['status'] },
): boolean {
  let applied = false
  client.setQueryData(queryKey, (current: unknown) => {
    if (!isOrder(current) || current.id !== event.orderId) {
      return current
    }
    if (
      event.version > current.version &&
      acceptsOrderStatus(current.status, event.status)
    ) {
      applied = true
      return {
        ...current,
        status: event.status,
        version: event.version,
      }
    }
    return current
  })
  return applied
}

function citesNft(data: unknown, nftId: string): boolean {
  if (!data || typeof data !== 'object' || !('items' in data)) {
    return false
  }
  const items = (data as { items: unknown }).items
  if (!Array.isArray(items)) {
    return false
  }
  return items.some((item) => {
    if (!item || typeof item !== 'object' || !('nftId' in item)) {
      return false
    }
    return (item as { nftId: unknown }).nftId === nftId
  })
}

function commerceMatches(query: Query, nftId: string): boolean {
  const root = query.queryKey[0]
  if (root !== 'cart' && root !== 'quote') {
    return false
  }
  if (citesNft(query.state.data, nftId)) {
    return true
  }
  return (
    query.state.data === undefined && query.state.fetchStatus === 'fetching'
  )
}

async function invalidateCommerce(
  client: QueryClient,
  nftId: string,
): Promise<void> {
  const predicate = (query: Query) => commerceMatches(query, nftId)
  const matches = client.getQueryCache().findAll({ predicate })
  if (matches.length === 0) {
    return
  }
  if (matches.some((query) => query.queryKey[0] === 'quote')) {
    publishPriceNotice()
  }
  await client.cancelQueries({ predicate })
  await client.invalidateQueries({ predicate })
}

async function refreshQuery(
  client: QueryClient,
  queryKey: readonly unknown[],
): Promise<void> {
  await client.cancelQueries({ queryKey, exact: true })
  await client.invalidateQueries({ queryKey, exact: true })
}

export async function applyNftUpdated(
  client: QueryClient,
  payload: unknown,
  seen: Set<string>,
): Promise<void> {
  const parsed = nftUpdatedEventSchema.safeParse(payload)
  if (!parsed.success) {
    return
  }
  const event = parsed.data
  if (seen.has(event.eventId)) {
    return
  }
  seen.add(event.eventId)

  let patched = false
  let sawNft = false
  const refetchKeys: Array<readonly unknown[]> = []
  for (const query of client.getQueryCache().findAll({ queryKey: ['nfts'] })) {
    const data = query.state.data
    const inDetail = isNft(data) && data.id === event.nftId
    const inPage =
      isNftPage(data) && data.items.some((item) => item.id === event.nftId)
    if (!inDetail && !inPage) {
      continue
    }
    sawNft = true
    await client.cancelQueries({ queryKey: query.queryKey, exact: true })
    const outcome = commitNft(client, query.queryKey, event)
    if (outcome === 'patched') {
      patched = true
    }
    if (outcome === 'refetch') {
      refetchKeys.push(query.queryKey)
    }
  }

  if (patched || !sawNft) {
    await invalidateCommerce(client, event.nftId)
  }
  for (const queryKey of refetchKeys) {
    await refreshQuery(client, queryKey)
  }
}

export async function applyOrderUpdated(
  client: QueryClient,
  payload: unknown,
  seen: Set<string>,
  token: string,
): Promise<void> {
  const parsed = orderUpdatedEventSchema.safeParse(payload)
  if (!parsed.success) {
    return
  }
  const event = parsed.data
  if (seen.has(event.eventId)) {
    return
  }

  const session = sessionForToken(client, token)
  if (!session) {
    seen.add(event.eventId)
    return
  }

  const queryKey = ['orders', session.user.id, event.orderId] as const
  const hadOrder = isOrder(client.getQueryData(queryKey))
  await client.cancelQueries({ queryKey, exact: true })

  const still = sessionForToken(client, token)
  if (!still || still.user.id !== session.user.id) {
    seen.add(event.eventId)
    return
  }

  const applied = commitOrder(client, queryKey, event)
  seen.add(event.eventId)
  if (!applied && hadOrder) {
    return
  }
  if (!sessionForToken(client, token)) {
    return
  }
  await client.invalidateQueries({ queryKey })
}

export function refetchRealtime(
  client: QueryClient,
  token: string | null,
): void {
  void client.invalidateQueries({ queryKey: ['nfts'], refetchType: 'active' })
  if (!token) {
    return
  }
  const session = client.getQueryData<SessionResponse>(sessionQueryKey)
  if (!session || session.token !== token) {
    return
  }
  void client.invalidateQueries({
    refetchType: 'active',
    predicate: (query) => {
      if (
        query.queryKey[0] !== 'orders' ||
        query.queryKey[1] !== session.user.id
      ) {
        return false
      }
      const data = query.state.data
      return isOrder(data) && data.status === 'pending'
    },
  })
}
