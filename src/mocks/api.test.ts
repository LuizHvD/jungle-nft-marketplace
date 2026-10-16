import { describe, expect, it, vi } from 'vitest'
import { adaWalletAddress, biaWalletAddress } from './fixtures/accounts.ts'
import { holdNextOrderCommit, readMemoryState } from './store.ts'
import { api, startMockServer } from './test-harness.ts'

startMockServer()

async function login(email: string, password: string): Promise<string> {
  const response = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  expect(response.status).toBe(200)
  return String(response.data?.token)
}

async function quoteFor(
  token: string,
  nftId: string,
  editionId: string,
  quantity = 1,
): Promise<{ quoteId: string; total: string }> {
  const response = await api('/api/quotes', {
    method: 'POST',
    token,
    body: JSON.stringify({
      items: [{ nftId, editionId, quantity }],
      walletId: 'wallet-ada',
      network: 'demo-mainnet',
    }),
  })
  expect(response.status).toBe(200)
  return {
    quoteId: String(response.data?.quoteId),
    total: String(response.data?.total),
  }
}

describe('contratos do mock', () => {
  it('rejeita número JSON no corpo da cotação', async () => {
    const token = await login('ada@demo.jungle', 'ada-demo-pass')
    const response = await api('/api/quotes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        items: [
          { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
        ],
        couponCode: 10,
      }),
    })
    expect(response.status).toBe(400)
    expect(response.data?.code).toBe('VALIDATION')
  })

  it('isola pedido, favorito, carteira e carrinho', async () => {
    const ada = await login('ada@demo.jungle', 'ada-demo-pass')
    const bia = await login('bia@demo.jungle', 'bia-demo-pass')
    const own = await api('/api/orders/order-ada-1', { token: ada })
    expect(own.status).toBe(200)
    const hidden = await api('/api/orders/order-ada-1', { token: bia })
    expect(hidden.status).toBe(404)
    expect(JSON.stringify(hidden.data)).not.toContain('1.002000000000000000')

    const favorites = await api('/api/favorites', { token: bia })
    expect(favorites.data).toEqual({ nftIds: ['nft-moss'] })

    const wallets = await api('/api/wallets', { token: bia })
    expect(JSON.stringify(wallets.data)).not.toContain(adaWalletAddress)
    expect(JSON.stringify(wallets.data)).toContain(biaWalletAddress)

    const cart = await api('/api/cart', { token: bia })
    expect(JSON.stringify(cart.data)).not.toContain('cart-ada-aurora')
  })

  it('cotação preliminar não é definitiva e a final segue a rede', async () => {
    const token = await login('ada@demo.jungle', 'ada-demo-pass')
    const preliminary = await api('/api/quotes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        items: [
          { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
        ],
      }),
    })
    expect(preliminary.data).toMatchObject({
      definitive: false,
      fee: '0.002000000000000000',
      network: null,
    })

    const missingWallet = await api('/api/quotes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        items: [
          { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
        ],
        network: 'demo-l2',
      }),
    })
    expect(missingWallet.status).toBe(422)

    await api('/api/wallets/wallet-ada/connection', {
      method: 'POST',
      token,
      body: JSON.stringify({ network: 'demo-l2', action: 'connect' }),
    })
    const finalQuote = await api('/api/quotes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        items: [
          { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
        ],
        walletId: 'wallet-ada',
        network: 'demo-l2',
      }),
    })
    expect(finalQuote.data).toMatchObject({
      definitive: true,
      fee: '0.000100000000000000',
      network: 'demo-l2',
    })
  })

  it('aceita cupom vigente e recusa inválido ou expirado', async () => {
    const token = await login('ada@demo.jungle', 'ada-demo-pass')
    const valid = await api('/api/quotes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        items: [
          { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
        ],
        couponCode: 'GREEN10',
      }),
    })
    expect(valid.status).toBe(200)
    expect(valid.data?.discount).toBe('0.150000000000000000')

    const expired = await api('/api/quotes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        items: [
          { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
        ],
        couponCode: 'OLD20',
      }),
    })
    expect(expired.status).toBe(422)
    expect(expired.data?.code).toBe('COUPON_EXPIRED')

    const invalid = await api('/api/quotes', {
      method: 'POST',
      token,
      body: JSON.stringify({
        items: [
          { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
        ],
        couponCode: 'NOPE',
      }),
    })
    expect(invalid.status).toBe(422)
    expect(invalid.data?.code).toBe('COUPON_INVALID')
  })

  it('devolve o mesmo pedido e entra em conflito quando o payload muda', async () => {
    const token = await login('ada@demo.jungle', 'ada-demo-pass')
    const firstQuote = await quoteFor(token, 'nft-aurora', 'edition-aurora-1')
    const created = await api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'attempt-1' },
      body: JSON.stringify({
        quoteId: firstQuote.quoteId,
        expectedTotal: firstQuote.total,
      }),
    })
    expect(created.status).toBe(200)

    await api('/api/demo/clock', {
      method: 'POST',
      body: JSON.stringify({ now: '2026-10-15T13:00:00.000Z' }),
    })
    const replay = await api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'attempt-1' },
      body: JSON.stringify({
        quoteId: firstQuote.quoteId,
        expectedTotal: firstQuote.total,
      }),
    })
    expect(replay.status).toBe(200)
    expect(replay.data?.id).toBe(created.data?.id)

    const otherQuote = await quoteFor(token, 'nft-aurora', 'edition-aurora-1')
    const conflict = await api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'attempt-1' },
      body: JSON.stringify({
        quoteId: otherQuote.quoteId,
        expectedTotal: otherQuote.total,
      }),
    })
    expect(conflict.status).toBe(409)
    expect(conflict.data?.code).toBe('IDEMPOTENCY_CONFLICT')
    expect(
      readMemoryState().orders.filter((order) => order.actorId === 'user-ada'),
    ).toHaveLength(2)
  })

  it('não entrega o pedido de A para B', async () => {
    const ada = await login('ada@demo.jungle', 'ada-demo-pass')
    const bia = await login('bia@demo.jungle', 'bia-demo-pass')
    const quote = await quoteFor(ada, 'nft-aurora', 'edition-aurora-1')
    const created = await api('/api/orders', {
      method: 'POST',
      token: ada,
      headers: { 'idempotency-key': 'shared-key' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    const stolen = await api('/api/orders', {
      method: 'POST',
      token: bia,
      headers: { 'idempotency-key': 'shared-key' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    expect(stolen.status).toBe(404)
    expect(stolen.data?.id).toBeUndefined()
    expect(JSON.stringify(stolen.data)).not.toContain(String(created.data?.id))
    const visible = await api(`/api/orders/${String(created.data?.id)}`, {
      token: bia,
    })
    expect(visible.status).toBe(404)
  })

  it('serializa pedidos concorrentes', async () => {
    const token = await login('ada@demo.jungle', 'ada-demo-pass')
    const left = await quoteFor(token, 'nft-moss', 'edition-moss-1')
    const right = await quoteFor(token, 'nft-moss', 'edition-moss-1')
    const hold = holdNextOrderCommit()
    const first = api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'moss-a' },
      body: JSON.stringify({
        quoteId: left.quoteId,
        expectedTotal: left.total,
      }),
    })
    await hold.entered
    const second = api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'moss-b' },
      body: JSON.stringify({
        quoteId: right.quoteId,
        expectedTotal: right.total,
      }),
    })
    hold.release()
    const results = await Promise.all([first, second])
    const statuses = results.map((result) => result.status).sort()
    expect(statuses).toEqual([200, 409])
    expect(results.find((result) => result.status === 409)?.data?.code).toBe(
      'SOLD_OUT',
    )
    const moss = readMemoryState().nfts.find((nft) => nft.id === 'nft-moss')
    expect(moss?.editions[0]?.availableSupply).toBe(0)
    expect(
      readMemoryState().orders.filter(
        (order) =>
          order.quoteId === left.quoteId || order.quoteId === right.quoteId,
      ),
    ).toHaveLength(1)
  })

  it('usa a mesma chave concorrente uma única vez', async () => {
    const token = await login('ada@demo.jungle', 'ada-demo-pass')
    const quote = await quoteFor(token, 'nft-aurora', 'edition-aurora-1')
    const hold = holdNextOrderCommit()
    const first = api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'same-key' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    await hold.entered
    const second = api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'same-key' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    hold.release()
    const results = await Promise.all([first, second])
    expect(results.map((result) => result.status)).toEqual([200, 200])
    expect(results[0]?.data?.id).toBe(results[1]?.data?.id)
    const aurora = readMemoryState().nfts.find((nft) => nft.id === 'nft-aurora')
    expect(aurora?.editions[0]?.availableSupply).toBe(3)
  })

  it('persiste o pedido antes do timeout e o replay devolve o mesmo id', async () => {
    const token = await login('ada@demo.jungle', 'ada-demo-pass')
    const quote = await quoteFor(token, 'nft-aurora', 'edition-aurora-1')
    await api('/api/demo/scenario', {
      method: 'POST',
      body: JSON.stringify({ id: 'timeout' }),
    })
    const controller = new AbortController()
    const hung = api('/api/orders', {
      method: 'POST',
      token,
      signal: controller.signal,
      headers: { 'idempotency-key': 'timeout-key' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    await vi.waitFor(() => {
      expect(
        readMemoryState().orders.some(
          (order) => order.quoteId === quote.quoteId,
        ),
      ).toBe(true)
    })
    const replay = await api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'timeout-key' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    expect(replay.status).toBe(200)
    controller.abort()
    await hung.catch(() => undefined)
    const again = await api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'timeout-key' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    expect(again.data?.id).toBe(replay.data?.id)
    expect(
      readMemoryState().orders.filter(
        (order) => order.quoteId === quote.quoteId,
      ),
    ).toHaveLength(1)
  })

  it('congela o snapshot e o reset volta a fixture depois do 500', async () => {
    const token = await login('ada@demo.jungle', 'ada-demo-pass')
    const quote = await quoteFor(token, 'nft-aurora', 'edition-aurora-1')
    const created = await api('/api/orders', {
      method: 'POST',
      token,
      headers: { 'idempotency-key': 'snapshot' },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    await api('/api/demo/scenario', {
      method: 'POST',
      body: JSON.stringify({ id: 'price-change' }),
    })
    const receipt = await api(`/api/orders/${String(created.data?.id)}`, {
      token,
    })
    expect(receipt.data?.snapshot).toMatchObject({ total: quote.total })

    await api('/api/demo/scenario', {
      method: 'POST',
      body: JSON.stringify({ id: 'transient' }),
    })
    const failed = await api('/api/nfts')
    expect(failed.status).toBe(500)
    expect(failed.data?.code).toBe('TRANSIENT')
    const reset = await api('/api/demo/reset', { method: 'POST' })
    expect(reset.status).toBe(200)
    const restored = await api('/api/nfts/nft-aurora')
    expect(restored.status).toBe(200)
    expect(JSON.stringify(restored.data)).toContain('1.500000000000000000')
    expect(readMemoryState().orders.map((order) => order.id)).toEqual([
      'order-ada-1',
      'order-bia-1',
    ])
  })

  it('mantém o carrinho do visitante no estado do ator', async () => {
    const created = await api('/api/cart/items', {
      method: 'POST',
      guestId: 'guest-persist',
      body: JSON.stringify({
        nftId: 'nft-aurora',
        editionId: 'edition-aurora-1',
        quantity: 1,
      }),
    })
    expect(created.status).toBe(200)
    const cart = await api('/api/cart', { guestId: 'guest-persist' })
    expect(cart.data?.actorId).toBe('guest:guest-persist')
    expect(cart.data?.items).toHaveLength(1)
  })
})
