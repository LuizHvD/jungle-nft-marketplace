import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it } from 'vitest'

import { isPrivateQueryKey } from '@/lib/session/private-cache.ts'
import { setSessionStore, writeStoredSession } from '@/lib/session/storage.ts'

import { addDecimals, sameDecimal } from './money-display.ts'
import { mergeGuestCart } from './merge-guest-cart.ts'
import {
  markOrderAttemptPosted,
  prepareOrderAttempt,
  readOrderAttempt,
  releaseUnconsumedAttempt,
} from './order-attempt.ts'
import { appendOrderId, readOrderIndex } from './order-index.ts'
import { commitOwnedCart, commitOwnedFavorites } from './owned.ts'
import { peekGuestId, readGuestId } from './guest-id.ts'
import { resetCommerceMemory, setCommerceStores } from './storage.ts'

const ada = {
  token: 'token-ada',
  expiresAt: '2026-01-01T00:00:00.000Z',
  user: { id: 'user-ada', email: 'ada@demo.jungle', name: 'Ada' },
}

const bia = {
  token: 'token-bia',
  expiresAt: '2026-01-01T00:00:00.000Z',
  user: { id: 'user-bia', email: 'bia@demo.jungle', name: 'Bia' },
}

function memoryStore() {
  const items = new Map<string, string>()
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
    removeItem: (key: string) => {
      items.delete(key)
    },
  }
}

describe('compra', () => {
  afterEach(() => {
    setCommerceStores({ local: null, session: null })
    setSessionStore(null)
    resetCommerceMemory()
  })

  it('soma strings decimais com wei', () => {
    expect(addDecimals(['1.500000000000000000', '0.002000000000000000'])).toBe(
      '1.502000000000000000',
    )
    expect(sameDecimal('1.50', '1.500000000000000000')).toBe(true)
    expect(isPrivateQueryKey(['quote', 'user-ada', 'sig'])).toBe(true)
  })

  it('não gira o visitante quando o merge falha', async () => {
    const local = memoryStore()
    setCommerceStores({ local })
    const guestId = readGuestId()
    const result = await mergeGuestCart('token-ada', () =>
      Promise.reject(new Error('falha')),
    )
    expect(result).toBe('failed')
    expect(peekGuestId()).toBe(guestId)
  })

  it('gira o visitante só depois do merge', async () => {
    const local = memoryStore()
    setCommerceStores({ local })
    const guestId = readGuestId()
    const seen: string[] = []
    const result = await mergeGuestCart('token-ada', (posted, token) => {
      seen.push(`${posted}:${token}`)
      return Promise.resolve()
    })
    expect(result).toBe('merged')
    expect(seen).toEqual([`${guestId}:token-ada`])
    expect(peekGuestId()).not.toBe(guestId)
  })

  it('reutiliza a chave e bloqueia payload diferente já enviado', () => {
    setCommerceStores({ local: memoryStore() })
    const first = prepareOrderAttempt({
      userId: 'user-ada',
      quoteId: 'quote-1',
      expectedTotal: '1.000000000000000000',
    })
    const again = prepareOrderAttempt({
      userId: 'user-ada',
      quoteId: 'quote-1',
      expectedTotal: '1.000000000000000000',
    })
    expect(again.blocked).toBe(false)
    if (!again.blocked && !first.blocked) {
      expect(again.attempt.key).toBe(first.attempt.key)
    }
    markOrderAttemptPosted('user-ada')
    const blocked = prepareOrderAttempt({
      userId: 'user-ada',
      quoteId: 'quote-2',
      expectedTotal: '9.000000000000000000',
    })
    expect(blocked.blocked).toBe(true)
    if (blocked.blocked && !first.blocked) {
      expect(blocked.attempt.key).toBe(first.attempt.key)
    }
  })

  it('mantém a chave da Ada quando a Bia prepara outra', () => {
    const local = memoryStore()
    setCommerceStores({ local })
    const adaAttempt = prepareOrderAttempt({
      userId: 'user-ada',
      quoteId: 'quote-ada',
      expectedTotal: '1.000000000000000000',
    })
    const biaAttempt = prepareOrderAttempt({
      userId: 'user-bia',
      quoteId: 'quote-bia',
      expectedTotal: '2.000000000000000000',
    })
    expect(biaAttempt.blocked).toBe(false)
    if (!adaAttempt.blocked) {
      expect(readOrderAttempt('user-ada')?.key).toBe(adaAttempt.attempt.key)
    }
    appendOrderId('user-ada', 'order-ada')
    appendOrderId('user-bia', 'order-bia')
    expect(readOrderIndex('user-bia')).toEqual(['order-bia'])
    releaseUnconsumedAttempt('user-bia')
    expect(readOrderAttempt('user-ada')).not.toBeNull()
  })

  it('não grava carrinho nem favorito de outro ator', () => {
    const local = memoryStore()
    setCommerceStores({ local })
    setSessionStore(local)
    writeStoredSession(bia)
    const client = new QueryClient()
    const cartApplied = commitOwnedCart(
      client,
      { kind: 'user', userId: ada.user.id, token: ada.token },
      { actorId: ada.user.id, items: [] },
    )
    const favoriteApplied = commitOwnedFavorites(
      client,
      { userId: ada.user.id, token: ada.token },
      { nftIds: ['nft-aurora'] },
    )
    expect(cartApplied).toBe(false)
    expect(favoriteApplied).toBe(false)
    expect(client.getQueryData(['cart', ada.user.id])).toBeUndefined()
    expect(client.getQueryData(['favorites', ada.user.id])).toBeUndefined()
  })
})
