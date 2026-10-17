import { QueryClient, type Query } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Nft, NftPage } from '@/contracts/nfts.ts'
import type { OrderResponse } from '@/contracts/orders.ts'
import { sessionQueryKey } from '@/lib/session/private-cache.ts'

import {
  applyNftUpdated,
  applyOrderUpdated,
  shareNft,
  shareNftPage,
  shareOrder,
} from './apply-realtime.ts'
import { clearPriceNotice, readPriceNotice } from './price-notice.ts'

const session = {
  token: 'token-ada',
  expiresAt: '2026-10-15T12:00:00.000Z',
  user: { id: 'user-ada', email: 'ada@demo.jungle', name: 'Ada Demo' },
}

function nft(version: number, price = '1.500000000000000000', supply = 4): Nft {
  return {
    id: 'nft-aurora',
    name: 'Aurora',
    version,
    editions: [{ id: 'edition-aurora-1', price, availableSupply: supply }],
  }
}

function page(item: Nft): NftPage {
  return { items: [item, moss], page: 1, pageSize: 12, total: 2 }
}

const moss: Nft = {
  id: 'nft-moss',
  name: 'Moss',
  version: 1,
  editions: [
    { id: 'edition-moss-1', price: '0.250000000000000000', availableSupply: 1 },
  ],
}

function order(
  status: OrderResponse['status'],
  version: number,
): OrderResponse {
  return {
    id: 'order-1',
    quoteId: 'quote-1',
    status,
    version,
    snapshot: {
      items: [
        {
          nftId: 'nft-aurora',
          editionId: 'edition-aurora-1',
          quantity: 1,
          unitPrice: '1.500000000000000000',
        },
      ],
      subtotal: '1.500000000000000000',
      discount: '0.000000000000000000',
      fee: '0.002000000000000000',
      total: '1.502000000000000000',
      couponCode: null,
    },
  }
}

function clientWith() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const invalidated: Array<{
    predicate?: (query: Query) => boolean
    queryKey?: unknown
  }> = []
  vi.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
    invalidated.push(filters ?? {})
    return Promise.resolve()
  })
  vi.spyOn(client, 'cancelQueries').mockResolvedValue(undefined)
  return { client, invalidated }
}

describe('cache de tempo real', () => {
  beforeEach(() => {
    clearPriceNotice()
  })

  it('mantém o registro de versão maior entre GET e evento', () => {
    const current = nft(3, '2.000000000000000000', 4)
    expect(shareNft(current, nft(2)).version).toBe(3)
    expect(
      shareNft(nft(2), nft(4, '2.000000000000000000')).editions[0]?.price,
    ).toBe('2.000000000000000000')
    const stalePage = page(nft(1))
    const fresh = shareNftPage(page(current), stalePage)
    expect(fresh.items[0]?.version).toBe(3)
    expect(fresh.items[1]?.id).toBe('nft-moss')
  })

  it('atualiza preço e estoque e invalida só o comércio daquele NFT', async () => {
    const { client, invalidated } = clientWith()
    const seen = new Set<string>()
    client.setQueryData(['nfts', 'detail', 'nft-aurora'], nft(1))
    client.setQueryData(['nfts', { page: 1 }], page(nft(1)))
    client.setQueryData(['spike-nft'], {
      id: 'spike-nft',
      version: 1,
      price: '1.000000000000000000',
    })
    client.setQueryData(['quote', 'user-ada', 'aurora'], {
      quoteId: 'quote-aurora',
      items: [
        { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
      ],
    })
    client.setQueryData(['quote', 'user-ada', 'moss'], {
      quoteId: 'quote-moss',
      items: [{ nftId: 'nft-moss', editionId: 'edition-moss-1', quantity: 1 }],
    })
    client.setQueryData(['cart', 'user-ada'], {
      actorId: 'user-ada',
      items: [
        { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
      ],
    })

    await applyNftUpdated(
      client,
      {
        eventId: 'event-1',
        nftId: 'nft-aurora',
        editionId: 'edition-aurora-1',
        version: 2,
        price: '2.000000000000000000',
        availableSupply: 3,
      },
      seen,
    )

    const detail = client.getQueryData<Nft>(['nfts', 'detail', 'nft-aurora'])
    expect(detail?.version).toBe(2)
    expect(detail?.editions[0]?.price).toBe('2.000000000000000000')
    expect(detail?.editions[0]?.availableSupply).toBe(3)
    const list = client.getQueryData<NftPage>(['nfts', { page: 1 }])
    expect(list?.items[0]?.version).toBe(2)
    expect(list?.items[1]?.version).toBe(1)
    expect(client.getQueryData(['spike-nft'])).toEqual({
      id: 'spike-nft',
      version: 1,
      price: '1.000000000000000000',
    })
    expect(readPriceNotice()).toBe('O preço mudou.')
    const commerce = invalidated.find((filters) => filters.predicate)
    const auroraQuote = client
      .getQueryCache()
      .find({ queryKey: ['quote', 'user-ada', 'aurora'] })
    const mossQuote = client
      .getQueryCache()
      .find({ queryKey: ['quote', 'user-ada', 'moss'] })
    const cart = client.getQueryCache().find({ queryKey: ['cart', 'user-ada'] })
    expect(auroraQuote && commerce?.predicate?.(auroraQuote)).toBe(true)
    expect(mossQuote && commerce?.predicate?.(mossQuote)).toBe(false)
    expect(cart && commerce?.predicate?.(cart)).toBe(true)
  })

  it('ignora evento duplicado, versão antiga e nft fora do cache', async () => {
    const { client, invalidated } = clientWith()
    const seen = new Set<string>()
    client.setQueryData(
      ['nfts', 'detail', 'nft-aurora'],
      nft(3, '2.000000000000000000'),
    )
    client.setQueryData(['quote', 'user-ada', 'aurora'], {
      items: [{ nftId: 'nft-aurora' }],
    })
    const stale = {
      eventId: 'event-old',
      nftId: 'nft-aurora',
      editionId: 'edition-aurora-1',
      version: 2,
      price: '1.500000000000000000',
      availableSupply: 1,
    }
    await applyNftUpdated(client, stale, seen)
    await applyNftUpdated(client, stale, seen)
    await applyNftUpdated(
      client,
      {
        eventId: 'event-spike',
        nftId: 'spike-nft',
        version: 4,
        price: '9.000000000000000000',
      },
      seen,
    )
    expect(
      client.getQueryData<Nft>(['nfts', 'detail', 'nft-aurora'])?.version,
    ).toBe(3)
    expect(invalidated).toEqual([])
    expect(readPriceNotice()).toBe('')
  })

  it('invalida a cotação quando o NFT ainda não está no cache', async () => {
    const { client, invalidated } = clientWith()
    client.setQueryData(['quote', 'user-ada', 'aurora'], {
      items: [{ nftId: 'nft-aurora' }],
    })
    await applyNftUpdated(
      client,
      {
        eventId: 'event-checkout',
        nftId: 'nft-aurora',
        editionId: 'edition-aurora-1',
        version: 2,
        price: '2.000000000000000000',
        availableSupply: 4,
      },
      new Set(),
    )
    expect(readPriceNotice()).toBe('O preço mudou.')
    const commerce = invalidated.find((filters) => filters.predicate)
    const quote = client.getQueryCache().find({
      queryKey: ['quote', 'user-ada', 'aurora'],
    })
    expect(quote && commerce?.predicate?.(quote)).toBe(true)
  })

  it('preserva o estoque quando o evento não traz availableSupply', async () => {
    const { client } = clientWith()
    client.setQueryData(
      ['nfts', 'detail', 'nft-aurora'],
      nft(1, '1.500000000000000000', 4),
    )
    await applyNftUpdated(
      client,
      {
        eventId: 'event-price',
        nftId: 'nft-aurora',
        editionId: 'edition-aurora-1',
        version: 2,
        price: '2.000000000000000000',
      },
      new Set(),
    )
    expect(
      client.getQueryData<Nft>(['nfts', 'detail', 'nft-aurora'])?.editions[0]
        ?.availableSupply,
    ).toBe(4)
  })

  it('sem editionId invalida o NFT em vez de escolher uma edição', async () => {
    const { client, invalidated } = clientWith()
    client.setQueryData(['nfts', 'detail', 'nft-aurora'], nft(1))
    await applyNftUpdated(
      client,
      {
        eventId: 'event-broad',
        nftId: 'nft-aurora',
        version: 2,
        price: '2.000000000000000000',
      },
      new Set(),
    )
    expect(
      client.getQueryData<Nft>(['nfts', 'detail', 'nft-aurora'])?.version,
    ).toBe(1)
    expect(invalidated.some((filters) => filters.queryKey)).toBe(true)
  })

  it('ignora payload inválido', async () => {
    const { client } = clientWith()
    client.setQueryData(['nfts', 'detail', 'nft-aurora'], nft(1))
    await applyNftUpdated(client, { eventId: '' }, new Set())
    expect(
      client.getQueryData<Nft>(['nfts', 'detail', 'nft-aurora'])?.version,
    ).toBe(1)
  })

  it('avança o pedido e recusa regressão terminal sem mexer no snapshot', async () => {
    const { client, invalidated } = clientWith()
    const seen = new Set<string>()
    client.setQueryData(sessionQueryKey, session)
    const current = order('pending', 1)
    client.setQueryData(['orders', 'user-ada', 'order-1'], current)
    await applyOrderUpdated(
      client,
      {
        eventId: 'event-order',
        orderId: 'order-1',
        version: 2,
        status: 'confirmed',
      },
      seen,
      'token-ada',
    )
    const next = client.getQueryData<OrderResponse>([
      'orders',
      'user-ada',
      'order-1',
    ])
    expect(next?.status).toBe('confirmed')
    expect(next?.version).toBe(2)
    expect(next?.snapshot).toEqual(current.snapshot)
    await applyOrderUpdated(
      client,
      {
        eventId: 'event-order',
        orderId: 'order-1',
        version: 3,
        status: 'pending',
      },
      seen,
      'token-ada',
    )
    await applyOrderUpdated(
      client,
      {
        eventId: 'event-back',
        orderId: 'order-1',
        version: 1,
        status: 'pending',
      },
      seen,
      'token-ada',
    )
    await applyOrderUpdated(
      client,
      {
        eventId: 'event-terminal',
        orderId: 'order-1',
        version: 4,
        status: 'declined',
      },
      seen,
      'token-ada',
    )
    const kept = client.getQueryData<OrderResponse>([
      'orders',
      'user-ada',
      'order-1',
    ])
    expect(kept?.status).toBe('confirmed')
    expect(kept?.version).toBe(2)
    expect(kept?.snapshot).toEqual(current.snapshot)
    expect(invalidated).toHaveLength(1)
  })

  it('não aplica order.updated de outro token', async () => {
    const { client, invalidated } = clientWith()
    client.setQueryData(sessionQueryKey, session)
    client.setQueryData(['orders', 'user-ada', 'order-1'], order('pending', 1))
    await applyOrderUpdated(
      client,
      {
        eventId: 'event-bia',
        orderId: 'order-1',
        version: 2,
        status: 'confirmed',
      },
      new Set(),
      'token-bia',
    )
    expect(
      client.getQueryData<OrderResponse>(['orders', 'user-ada', 'order-1'])
        ?.status,
    ).toBe('pending')
    expect(invalidated).toEqual([])
  })

  it('evento v2 não cobre o v3 quando o cancelamento resolve invertido', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    const gates: Array<() => void> = []
    let calls = 0
    vi.spyOn(client, 'cancelQueries').mockImplementation(() => {
      const index = calls
      calls += 1
      if (index < 2) {
        return new Promise((resolve) => {
          gates.push(() => resolve(undefined))
        })
      }
      return Promise.resolve()
    })
    const detailKey = ['nfts', 'detail', 'nft-aurora'] as const
    const pageKey = ['nfts', { page: 1 }] as const
    client.setQueryData(detailKey, nft(1))
    client.setQueryData(pageKey, page(nft(1)))
    client.setQueryData(['quote', 'user-ada', 'aurora'], {
      items: [{ nftId: 'nft-aurora' }],
    })
    const seen = new Set<string>()
    const older = applyNftUpdated(
      client,
      {
        eventId: 'event-v2',
        nftId: 'nft-aurora',
        editionId: 'edition-aurora-1',
        version: 2,
        price: '2.000000000000000000',
        availableSupply: 2,
      },
      seen,
    )
    const newer = applyNftUpdated(
      client,
      {
        eventId: 'event-v3',
        nftId: 'nft-aurora',
        editionId: 'edition-aurora-1',
        version: 3,
        price: '3.000000000000000000',
        availableSupply: 1,
      },
      seen,
    )
    gates[1]?.()
    await vi.waitFor(() => {
      expect(client.getQueryData<Nft>(detailKey)?.version).toBe(3)
    })
    gates[0]?.()
    await Promise.all([older, newer])
    const detail = client.getQueryData<Nft>(detailKey)
    const list = client.getQueryData<NftPage>(pageKey)
    expect(detail?.version).toBe(3)
    expect(detail?.editions[0]?.price).toBe('3.000000000000000000')
    expect(list?.items[0]?.version).toBe(3)
    expect(list?.items[0]?.editions[0]?.price).toBe('3.000000000000000000')
    expect(list?.items[1]?.version).toBe(1)
  })

  it('pedido v2 não cobre o v3 quando o cancelamento resolve invertido', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
    const gates: Array<() => void> = []
    let calls = 0
    vi.spyOn(client, 'cancelQueries').mockImplementation(() => {
      const index = calls
      calls += 1
      if (index < 2) {
        return new Promise((resolve) => {
          gates.push(() => resolve(undefined))
        })
      }
      return Promise.resolve()
    })
    client.setQueryData(sessionQueryKey, session)
    const key = ['orders', 'user-ada', 'order-1'] as const
    const current = order('pending', 1)
    client.setQueryData(key, current)
    const seen = new Set<string>()
    const older = applyOrderUpdated(
      client,
      {
        eventId: 'order-v2',
        orderId: 'order-1',
        version: 2,
        status: 'pending',
      },
      seen,
      'token-ada',
    )
    const newer = applyOrderUpdated(
      client,
      {
        eventId: 'order-v3',
        orderId: 'order-1',
        version: 3,
        status: 'confirmed',
      },
      seen,
      'token-ada',
    )
    gates[1]?.()
    await vi.waitFor(() => {
      expect(client.getQueryData<OrderResponse>(key)?.version).toBe(3)
    })
    gates[0]?.()
    await Promise.all([older, newer])
    const stored = client.getQueryData<OrderResponse>(key)
    expect(stored?.version).toBe(3)
    expect(stored?.status).toBe('confirmed')
    expect(stored?.snapshot).toEqual(current.snapshot)
  })

  it('troca de sessão durante o cancelamento não grava o pedido da Ada', async () => {
    const { client, invalidated } = clientWith()
    client.setQueryData(sessionQueryKey, session)
    client.setQueryData(['orders', 'user-ada', 'order-1'], order('pending', 1))
    vi.spyOn(client, 'cancelQueries').mockImplementation(() => {
      client.setQueryData(sessionQueryKey, {
        token: 'token-bia',
        expiresAt: session.expiresAt,
        user: { id: 'user-bia', email: 'bia@demo.jungle', name: 'Bia Demo' },
      })
      return Promise.resolve()
    })
    await applyOrderUpdated(
      client,
      {
        eventId: 'event-switch',
        orderId: 'order-1',
        version: 2,
        status: 'confirmed',
      },
      new Set(),
      'token-ada',
    )
    const stored = client.getQueryData<OrderResponse>([
      'orders',
      'user-ada',
      'order-1',
    ])
    expect(stored?.status).toBe('pending')
    expect(stored?.version).toBe(1)
    expect(invalidated).toEqual([])
  })

  it('GET mais novo substitui o evento e GET antigo não regride terminal', () => {
    const pending = order('pending', 1)
    const confirmed = order('confirmed', 3)
    expect(shareOrder(pending, confirmed).status).toBe('confirmed')
    expect(shareOrder(confirmed, order('pending', 2)).status).toBe('confirmed')
    expect(shareOrder(confirmed, order('pending', 2)).version).toBe(3)
    expect(shareOrder(confirmed, order('declined', 4)).status).toBe('confirmed')
    expect(shareOrder(confirmed, order('declined', 4)).version).toBe(3)
  })
})
