import type { Query, QueryClient } from '@tanstack/react-query'

import type { SessionResponse } from '@/contracts/auth.ts'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type NftUpdatedEvent,
} from '@/contracts/events.ts'
import type { Nft, NftPage } from '@/contracts/nfts.ts'
import type { OrderResponse } from '@/contracts/orders.ts'
import { acceptEventVersion, acceptsOrderStatus } from '@/domain/events.ts'
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

type NftDecision =
  { kind: 'same' } | { kind: 'refetch' } | { kind: 'patch'; nft: Nft }

function updateNft(nft: Nft, event: NftUpdatedEvent): NftDecision {
  if (event.version > nft.version) {
    const editionId = event.editionId
    const edition = editionId
      ? nft.editions.find((item) => item.id === editionId)
      : undefined
    if (!editionId || !edition) {
      return { kind: 'refetch' }
    }
    const availableSupply = event.availableSupply ?? edition.availableSupply
    return {
      kind: 'patch',
      nft: {
        ...nft,
        version: event.version,
        editions: nft.editions.map((item) =>
          item.id === editionId
            ? { ...item, price: event.price, availableSupply }
            : item,
        ),
      },
    }
  }
  return { kind: 'same' }
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

  let touched = false
  let sawNft = false
  for (const query of client.getQueryCache().findAll({ queryKey: ['nfts'] })) {
    const data = query.state.data
    if (isNft(data)) {
      if (data.id !== event.nftId) {
        continue
      }
      sawNft = true
      const next = updateNft(data, event)
      if (next.kind === 'same') {
        continue
      }
      touched = true
      if (next.kind === 'patch') {
        await client.cancelQueries({ queryKey: query.queryKey, exact: true })
        client.setQueryData(query.queryKey, next.nft)
      } else {
        await refreshQuery(client, query.queryKey)
      }
      continue
    }
    if (!isNftPage(data)) {
      continue
    }
    const current = data.items.find((item) => item.id === event.nftId)
    if (!current) {
      continue
    }
    sawNft = true
    const next = updateNft(current, event)
    if (next.kind === 'same') {
      continue
    }
    touched = true
    if (next.kind === 'patch') {
      await client.cancelQueries({ queryKey: query.queryKey, exact: true })
      client.setQueryData(query.queryKey, {
        ...data,
        items: data.items.map((item) =>
          item.id === event.nftId ? next.nft : item,
        ),
      })
    } else {
      await refreshQuery(client, query.queryKey)
    }
  }

  if (touched || !sawNft) {
    await invalidateCommerce(client, event.nftId)
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

  const session = client.getQueryData<SessionResponse>(sessionQueryKey)
  if (!session || session.token !== token) {
    seen.add(event.eventId)
    return
  }

  const queries = client.getQueryCache().findAll({
    predicate: (query) =>
      query.queryKey[0] === 'orders' &&
      query.queryKey[1] === session.user.id &&
      query.queryKey[2] === event.orderId,
  })

  if (queries.length === 0) {
    seen.add(event.eventId)
    void client.invalidateQueries({
      queryKey: ['orders', session.user.id, event.orderId],
    })
    return
  }

  let applied = false
  for (const query of queries) {
    const current = query.state.data
    if (!isOrder(current) || current.id !== event.orderId) {
      continue
    }
    if (
      !acceptEventVersion(current.version, event.version, seen, event.eventId)
    ) {
      continue
    }
    if (!acceptsOrderStatus(current.status, event.status)) {
      continue
    }
    await client.cancelQueries({ queryKey: query.queryKey, exact: true })
    client.setQueryData(query.queryKey, {
      ...current,
      status: event.status,
      version: event.version,
    })
    applied = true
  }
  seen.add(event.eventId)
  if (applied) {
    await client.invalidateQueries({
      queryKey: ['orders', session.user.id, event.orderId],
    })
  }
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
