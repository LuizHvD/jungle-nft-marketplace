import { expect, type Page, test } from '@playwright/test'

import { adaEmail, adaPassword, login, resetDemo } from './auth-helpers'

async function setScenario(page: Page, id: string) {
  const status = await page.evaluate(async (scenario) => {
    const response = await fetch('/api/demo/scenario', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: scenario }),
    })
    return response.status
  }, id)
  expect(status).toBe(200)
}

test('MSW, worker, refresh, preço, login, carrinho, checkout e pedido', async ({
  page,
}) => {
  test.skip(!process.env.SMOKE_URL, 'Defina SMOKE_URL para validar o deploy')
  const origin = (process.env.SMOKE_URL ?? '').replace(/\/$/, '')

  await page.goto(`${origin}/`)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible()

  const worker = await page.request.get(`${origin}/mockServiceWorker.js`)
  expect(worker.status()).toBe(200)
  expect(worker.headers()['content-type'] ?? '').toMatch(/javascript/)
  expect(await worker.text()).toContain('Mock Service Worker')

  await page.goto(`${origin}/nfts/nft-aurora`)
  await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()

  await page.goto(`${origin}/`)
  const price = page.getByTestId('nft-card-price-nft-aurora')
  await expect(price).toHaveText('1.500000000000000000')
  await setScenario(page, 'price-change')
  await expect(price).toHaveText('2.000000000000000000')

  await resetDemo(page)
  await login(page, adaEmail, adaPassword)

  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
  await expect(page.getByTestId('cart-line-edition-aurora-1')).toBeVisible()

  await page.goto('/checkout')
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Confirm Button' }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByTestId('quote-definitive')).toHaveText(
    'Cotação definitiva',
  )
  await expect(page.getByTestId('quote-state')).toHaveText('ready')

  await setScenario(page, 'payment-confirmed')
  await page.getByRole('button', { name: 'Confirm Button' }).click()
  await expect(page.getByTestId('order-receipt')).toBeVisible()
  await expect(page.getByTestId('order-status')).toHaveText('confirmed')
  const orderId = await page.getByTestId('order-id').innerText()
  await page.reload()
  await expect(page.getByTestId('order-status')).toHaveText('confirmed')
  await expect(page.getByTestId('order-receipt')).toBeVisible()

  await page.goto('/pedidos')
  await expect(page.getByRole('heading', { name: 'Pedidos' })).toBeVisible()
  await expect(page.getByRole('link', { name: orderId })).toBeVisible()
})
