import { expect, test, type Page } from '@playwright/test'

type SocketEvent = {
  type: string
  payload: { orderId?: string; nftId?: string }
}

async function ready(page: Page): Promise<void> {
  await page.goto('/spike')
  await expect(
    page.getByRole('heading', { name: 'Spike Socket.IO' }),
  ).toBeVisible()
}

async function login(
  page: Page,
  email: string,
  password: string,
): Promise<string> {
  return page.evaluate(
    async ({ email: account, password: secret }) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: account, password: secret }),
      })
      const body = (await response.json()) as { token: string }
      return body.token
    },
    { email, password },
  )
}

async function connect(page: Page, token?: string): Promise<void> {
  await page.evaluate(async (authToken) => {
    const win = window as Window & {
      __jungleConnect?: (value?: string) => {
        on: (event: string, listener: (payload: unknown) => void) => void
      }
      __events?: SocketEventHolder[]
    }
    type SocketEventHolder = {
      type: string
      payload: { orderId?: string; nftId?: string }
    }
    const events: SocketEventHolder[] = []
    win.__events = events
    const open = win.__jungleConnect
    if (!open) {
      throw new Error('ponte de socket ausente')
    }
    const socket = open(authToken)
    socket.on('nft.updated', (payload) => {
      events.push({
        type: 'nft.updated',
        payload: payload as SocketEventHolder['payload'],
      })
    })
    socket.on('order.updated', (payload) => {
      events.push({
        type: 'order.updated',
        payload: payload as SocketEventHolder['payload'],
      })
    })
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('socket sem conexão')),
        10000,
      )
      socket.on('connect', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }, token)
}

async function events(page: Page): Promise<SocketEvent[]> {
  return page.evaluate(() => {
    const win = window as Window & { __events?: SocketEvent[] }
    return win.__events ?? []
  })
}

test('order.updated chega só para A', async ({ page, context }) => {
  test.setTimeout(60_000)
  await ready(page)
  await page.evaluate(async () => {
    const response = await fetch('/api/demo/reset', { method: 'POST' })
    if (!response.ok) {
      throw new Error('reset falhou')
    }
  })

  const biaPage = await context.newPage()
  const visitor = await context.newPage()
  await ready(biaPage)
  await ready(visitor)

  const adaToken = await login(page, 'ada@demo.jungle', 'ada-demo-pass')
  const biaToken = await login(biaPage, 'bia@demo.jungle', 'bia-demo-pass')
  await connect(page, adaToken)
  await connect(biaPage, biaToken)
  await connect(visitor)

  await expect
    .poll(async () => {
      await page.evaluate(async () => {
        await fetch('/api/demo/scenario', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: 'price-change' }),
        })
      })
      const counts = await Promise.all([
        events(page),
        events(biaPage),
        events(visitor),
      ])
      return counts.every((list) =>
        list.some((event) => event.type === 'nft.updated'),
      )
    })
    .toBe(true)

  const orderId = await page.evaluate(async (token) => {
    const quoteResponse = await fetch('/api/quotes', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: [
          { nftId: 'nft-aurora', editionId: 'edition-aurora-1', quantity: 1 },
        ],
        walletId: 'wallet-ada',
        network: 'demo-mainnet',
      }),
    })
    const quote = (await quoteResponse.json()) as {
      quoteId: string
      total: string
    }
    const orderResponse = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'idempotency-key': 'socket-order',
      },
      body: JSON.stringify({
        quoteId: quote.quoteId,
        expectedTotal: quote.total,
      }),
    })
    const order = (await orderResponse.json()) as { id: string }
    return order.id
  }, adaToken)

  await expect
    .poll(async () => events(page))
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'order.updated',
          payload: expect.objectContaining({ orderId }),
        }),
      ]),
    )

  const biaEvents = await events(biaPage)
  const visitorEvents = await events(visitor)
  expect(biaEvents.some((event) => event.type === 'order.updated')).toBe(false)
  expect(visitorEvents.some((event) => event.type === 'order.updated')).toBe(
    false,
  )
})
