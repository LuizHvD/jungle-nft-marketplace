import { expect, test } from '@playwright/test'

test('MSW, service worker, refresh e socket no deploy', async ({ page }) => {
  test.skip(!process.env.SMOKE_URL, 'Defina SMOKE_URL para validar o deploy')
  const origin = (process.env.SMOKE_URL ?? '').replace(/\/$/, '')

  await page.goto(`${origin}/`)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible()

  const worker = await page.request.get(`${origin}/mockServiceWorker.js`)
  expect(worker.status()).toBe(200)
  expect(worker.headers()['content-type'] ?? '').toMatch(/javascript/)
  expect(await worker.text()).toContain('mockServiceWorker')

  await page.goto(`${origin}/nfts/nft-aurora`)
  await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()

  await page.goto(`${origin}/`)
  const price = page.getByTestId('nft-card-price-nft-aurora')
  await expect(price).toHaveText('1.500000000000000000')
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/demo/scenario', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'price-change' }),
    })
    return response.status
  })
  expect(status).toBe(200)
  await expect(price).toHaveText('2.000000000000000000')
})
