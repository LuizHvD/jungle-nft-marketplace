import { expect, test } from '@playwright/test'
import { initialSpikePrice, nextSpikePrice } from '../src/contracts/spike-nft'

test('preço muda só depois do evento nft.updated', async ({ page }) => {
  let catalogReads = 0

  page.on('response', (response) => {
    const url = new URL(response.url())
    if (
      url.pathname === '/api/spike/nft' &&
      response.request().method() === 'GET'
    ) {
      catalogReads += 1
    }
  })

  await page.goto('/')
  await expect(page.getByTestId('socket-status')).toHaveText('connected')
  await expect(page.getByTestId('nft-price')).toHaveText(initialSpikePrice)
  const readsBeforeBump = catalogReads

  const bumpResponse = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      url.pathname === '/api/spike/nft/price' &&
      response.request().method() === 'POST'
    )
  })
  await page.getByRole('button', { name: 'Alterar preço' }).click()
  const response = await bumpResponse

  expect(response.status()).toBe(204)
  expect(await response.text()).toBe('')
  expect(catalogReads).toBe(readsBeforeBump)
  await expect(page.getByTestId('nft-price')).toHaveText(nextSpikePrice)
})
