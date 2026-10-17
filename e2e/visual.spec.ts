import { expect, test, type Page } from '@playwright/test'

import { adaEmail, adaPassword, login, resetDemo } from './auth-helpers'

const shots = [
  { width: 1440, height: 900, suffix: '1440' },
  { width: 768, height: 1024, suffix: '768' },
  { width: 390, height: 844, suffix: '390' },
] as const

async function shoot(page: Page, name: string) {
  await page.evaluate(async () => {
    const active = document.activeElement
    if (active instanceof HTMLElement) {
      active.blur()
    }
    await Promise.all(
      [...document.images].map((img) => {
        if (img.complete) {
          return Promise.resolve()
        }
        return new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        })
      }),
    )
  })
  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  })
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'preview', 'Baseline só no preview')
  test.skip(
    process.env.VISUAL_LINUX !== '1',
    'Baseline gerada no Ubuntu do CI, com Liberation Sans',
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

for (const shot of shots) {
  test(`telas estáveis em ${shot.suffix}px`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: shot.width, height: shot.height })
    await resetDemo(page)

    await page.goto('/')
    await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
    await shoot(page, `inicio-${shot.suffix}.png`)

    await page.goto('/nfts/nft-aurora')
    await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()
    await shoot(page, `detalhe-${shot.suffix}.png`)

    await login(page, adaEmail, adaPassword)
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-line-edition-aurora-1')).toBeVisible()
    await expect(page.getByTestId('money-total')).toBeVisible()
    await shoot(page, `carrinho-${shot.suffix}.png`)

    await page.goto('/checkout')
    await expect(page.getByLabel('Carteira')).toBeVisible()
    await expect(page.getByTestId('checkout-step')).toHaveText('dados')
    await shoot(page, `pagamento-${shot.suffix}.png`)
  })
}
