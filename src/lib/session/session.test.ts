import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { commitOwnedProfile, commitOwnedWallet } from './owned-cache.ts'
import { closeAuthTarget, safeReturnTo } from './return-to.ts'
import { retrySessionQuery } from './retry-session.ts'
import { logout } from './logout.ts'
import { handleUnauthorized } from './unauthorized.ts'
import {
  clearStoredSession,
  readStoredSession,
  readStoredToken,
  setSessionStore,
  writeStoredSession,
} from './storage.ts'

const ada = {
  token: 'token-ada',
  expiresAt: '2020-01-01T00:00:00.000Z',
  user: { id: 'user-ada', email: 'ada@demo.jungle', name: 'Ada Demo' },
}

const bia = {
  token: 'token-bia',
  expiresAt: '2020-01-01T00:00:00.000Z',
  user: { id: 'user-bia', email: 'bia@demo.jungle', name: 'Bia Demo' },
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

function testClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
}

function seed(client: QueryClient) {
  client.setQueryData(['session'], ada)
  client.setQueryData(['profile', 'user-ada'], { id: 'user-ada' })
  client.setQueryData(['wallets', 'user-ada'], { wallets: [] })
  client.setQueryData(['favorites', 'user-ada'], { nftIds: ['nft-aurora'] })
  client.setQueryData(['orders', 'user-ada'], { id: 'order-ada-1' })
  client.setQueryData(['cart', 'user-ada'], { items: [] })
  client.setQueryData(['quote', 'user-ada', 'sig'], { quoteId: 'quote-ada' })
  client.setQueryData(['nfts', {}], { items: ['aurora'] })
  client.setQueryData(['spike-nft'], { id: 'spike' })
}

describe('sessão', () => {
  beforeEach(() => {
    setSessionStore(memoryStore())
  })

  afterEach(() => {
    setSessionStore(null)
  })

  it('aceita só caminho interno', () => {
    expect(safeReturnTo('/nfts/nft-aurora')).toBe('/nfts/nft-aurora')
    expect(safeReturnTo('/perfil?x=1')).toBe('/perfil?x=1')
    expect(safeReturnTo('https://evil.test')).toBe('/')
    expect(safeReturnTo('//evil.test')).toBe('/')
    expect(safeReturnTo('/\\\\evil')).toBe('/')
    expect(closeAuthTarget('/perfil')).toBe('/')
    expect(closeAuthTarget('/nfts/nft-aurora')).toBe('/nfts/nft-aurora')
  })

  it('mantém a sessão quando expiresAt é anterior ao relógio local', () => {
    writeStoredSession(ada)
    const now = vi.spyOn(Date, 'now')
    expect(readStoredToken()).toBe('token-ada')
    expect(readStoredSession()?.expiresAt).toBe(ada.expiresAt)
    expect(now).not.toHaveBeenCalled()
    now.mockRestore()
  })

  it('não limpa a sessão no 401 de senha atual', () => {
    writeStoredSession(ada)
    const client = testClient()
    seed(client)
    const decision = handleUnauthorized(
      {
        method: 'patch',
        url: '/profile/password',
        requestToken: ada.token,
        currentToken: ada.token,
        code: 'UNAUTHORIZED',
      },
      client,
      '/perfil',
    )
    expect(decision).toBe('keep')
    expect(readStoredToken()).toBe(ada.token)
    expect(client.getQueryData(['session'])).toEqual(ada)
    expect(client.getQueryData(['profile', 'user-ada'])).toEqual({ id: 'user-ada' })
  })

  it('limpa a sessão e as queries privadas no SESSION_EXPIRED do mesmo token', () => {
    writeStoredSession(ada)
    const client = testClient()
    seed(client)
    const decision = handleUnauthorized(
      {
        method: 'patch',
        url: '/profile/password',
        requestToken: ada.token,
        currentToken: ada.token,
        code: 'SESSION_EXPIRED',
      },
      client,
      '/perfil',
    )
    expect(decision).toBe('end')
    expect(readStoredToken()).toBeNull()
    expect(client.getQueryData(['session'])).toBeNull()
    expect(client.getQueryData(['profile', 'user-ada'])).toBeUndefined()
    expect(client.getQueryData(['wallets', 'user-ada'])).toBeUndefined()
    expect(client.getQueryData(['favorites', 'user-ada'])).toBeUndefined()
    expect(client.getQueryData(['orders', 'user-ada'])).toBeUndefined()
    expect(client.getQueryData(['cart', 'user-ada'])).toBeUndefined()
    expect(client.getQueryData(['quote', 'user-ada', 'sig'])).toBeUndefined()
    expect(client.getQueryData(['nfts', {}])).toEqual({ items: ['aurora'] })
    expect(client.getQueryData(['spike-nft'])).toEqual({ id: 'spike' })
  })

  it('ignora 401 atrasado de outro token', () => {
    writeStoredSession(bia)
    const client = testClient()
    seed(client)
    client.setQueryData(['session'], bia)
    client.setQueryData(['profile', 'user-bia'], { id: 'user-bia' })
    const decision = handleUnauthorized(
      {
        method: 'get',
        url: '/profile',
        requestToken: ada.token,
        currentToken: bia.token,
        code: 'UNAUTHORIZED',
      },
      client,
      '/carteiras',
    )
    expect(decision).toBe('ignore')
    expect(readStoredToken()).toBe(bia.token)
    expect(client.getQueryData(['session'])).toEqual(bia)
    expect(client.getQueryData(['profile', 'user-bia'])).toEqual({ id: 'user-bia' })
  })

  it('não trata o 401 de login nem o de logout como fim de sessão', () => {
    writeStoredSession(ada)
    const client = testClient()
    seed(client)
    expect(
      handleUnauthorized(
        {
          method: 'post',
          url: '/auth/login',
          requestToken: ada.token,
          currentToken: ada.token,
          code: 'UNAUTHORIZED',
        },
        client,
        '/login',
      ),
    ).toBe('keep')
    expect(
      handleUnauthorized(
        {
          method: 'post',
          url: '/auth/logout',
          requestToken: ada.token,
          currentToken: ada.token,
          code: 'UNAUTHORIZED',
        },
        client,
        '/',
      ),
    ).toBe('ignore')
    expect(readStoredToken()).toBe(ada.token)
    expect(client.getQueryData(['session'])).toEqual(ada)
  })

  it('revoga o token e limpa a sessão local quando o POST falha', () => {
    writeStoredSession(ada)
    const client = testClient()
    seed(client)
    const revoke = vi.fn().mockRejectedValue(new Error('falha'))
    logout(client, { kind: 'home' }, revoke)
    expect(revoke).toHaveBeenCalledWith(ada.token)
    expect(readStoredToken()).toBeNull()
    expect(client.getQueryData(['session'])).toBeNull()
    expect(client.getQueryData(['wallets', 'user-ada'])).toBeUndefined()
    expect(client.getQueryData(['nfts', {}])).toEqual({ items: ['aurora'] })
  })

  it('limpa a sessão local quando não há token para revogar', () => {
    clearStoredSession()
    const client = testClient()
    client.setQueryData(['session'], null)
    const revoke = vi.fn()
    logout(client, { kind: 'home' }, revoke)
    expect(revoke).not.toHaveBeenCalled()
    expect(client.getQueryData(['session'])).toBeNull()
  })

  it('repete a sessão uma vez só em falha transitória', () => {
    const transient = { isAxiosError: true, response: { status: 500 } }
    const denied = { isAxiosError: true, response: { status: 401 } }
    expect(retrySessionQuery(0, transient)).toBe(true)
    expect(retrySessionQuery(1, transient)).toBe(false)
    expect(retrySessionQuery(0, denied)).toBe(false)
    expect(retrySessionQuery(0, new Error('rede'))).toBe(true)
  })
})

describe('mutation atrasada', () => {
  beforeEach(() => {
    setSessionStore(memoryStore())
  })

  afterEach(() => {
    setSessionStore(null)
  })

  it('não grava perfil nem sessão da Ada depois do login da Bia', () => {
    writeStoredSession(bia)
    const client = testClient()
    client.setQueryData(['session'], bia)
    client.setQueryData(['profile', 'user-bia'], {
      id: 'user-bia',
      email: bia.user.email,
      name: bia.user.name,
      avatarId: null,
    })
    const applied = commitOwnedProfile(
      client,
      { userId: ada.user.id, token: ada.token },
      {
        id: ada.user.id,
        email: ada.user.email,
        name: 'Ada atrasada',
        avatarId: 'primary',
      },
      { syncName: true },
    )
    expect(applied).toBe(false)
    expect(client.getQueryData(['profile', 'user-ada'])).toBeUndefined()
    expect(client.getQueryData(['session'])).toEqual(bia)
    expect(readStoredSession()?.user.name).toBe('Bia Demo')
  })

  it('não recria a carteira da Ada depois do logout', () => {
    clearStoredSession()
    const client = testClient()
    const applied = commitOwnedWallet(
      client,
      { userId: ada.user.id, token: ada.token },
      {
        id: 'wallet-ada',
        label: 'Principal da Ada',
        address: '0xada0000000000000000000000000000000000001',
        role: 'primary',
        connection: { network: 'demo-mainnet', status: 'connected' },
      },
    )
    expect(applied).toBe(false)
    expect(client.getQueryData(['wallets', 'user-ada'])).toBeUndefined()
  })
})
