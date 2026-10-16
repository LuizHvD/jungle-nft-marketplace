import { expect, test } from '@playwright/test'

const guestId = 'guest-persist'

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/spike')
  await expect(
    page.getByRole('heading', { name: 'Spike Socket.IO' }),
  ).toBeVisible()
}

test('abas e refresh compartilham o carrinho até o reset', async ({
  page,
  context,
}) => {
  await ready(page)
  await page.evaluate(async (id) => {
    const reset = await fetch('/api/demo/reset', { method: 'POST' })
    if (!reset.ok) {
      throw new Error('reset falhou')
    }
    const created = await fetch('/api/cart/items', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-guest-id': id,
      },
      body: JSON.stringify({
        nftId: 'nft-aurora',
        editionId: 'edition-aurora-1',
        quantity: 1,
      }),
    })
    if (!created.ok) {
      throw new Error('carrinho falhou')
    }
  }, guestId)

  const other = await context.newPage()
  await ready(other)
  const shared = await other.evaluate(async (id) => {
    const response = await fetch('/api/cart', { headers: { 'x-guest-id': id } })
    return response.json()
  }, guestId)
  expect(shared.items).toHaveLength(1)

  await other.reload()
  await expect(
    other.getByRole('heading', { name: 'Spike Socket.IO' }),
  ).toBeVisible()
  const refreshed = await other.evaluate(async (id) => {
    const response = await fetch('/api/cart', { headers: { 'x-guest-id': id } })
    return response.json()
  }, guestId)
  expect(refreshed.items).toHaveLength(1)

  await other.evaluate(async () => {
    await fetch('/api/demo/reset', { method: 'POST' })
  })
  const cleared = await other.evaluate(async (id) => {
    const response = await fetch('/api/cart', { headers: { 'x-guest-id': id } })
    return response.json()
  }, guestId)
  expect(cleared.items).toHaveLength(0)
})
