import { expect, test, type Page } from '@playwright/test'

import { adaEmail, adaPassword, login, resetDemo } from './auth-helpers'

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const

async function expectNoHorizontalOverflow(page: Page) {
  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error('Viewport ausente.')
  }
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  )
  expect(scrollWidth).toBeLessThanOrEqual(viewport.width)
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'preview', 'Larguras no build de preview')
  await resetDemo(page)
})

for (const viewport of viewports) {
  test(`rotas de produto sem overflow em ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ ...viewport })
    await login(page, adaEmail, adaPassword)

    await page.goto('/')
    await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/nfts/nft-aurora')
    await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/carrinho')
    await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/checkout')
    await expect(
      page.getByRole('heading', { name: 'Pagamento com carteira' }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/pedidos/order-ada-1')
    await expect(page.getByTestId('order-receipt')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/perfil')
    await expect(
      page.getByRole('heading', {
        name: 'Perfil do colecionador',
        exact: true,
      }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/carteiras')
    await expect(
      page.getByRole('heading', { name: 'Carteiras', exact: true }),
    ).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
}
