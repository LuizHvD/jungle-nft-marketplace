import { expect, test, type Page } from '@playwright/test'

import { adaEmail, adaPassword, login, resetDemo } from './auth-helpers'

const shots = [
  { width: 1440, height: 900, suffix: '1440' },
  { width: 768, height: 1024, suffix: '768' },
  { width: 390, height: 844, suffix: '390' },
] as const

async function shoot(page: Page, name: string) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
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
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          window.setTimeout(done, 4000)
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
    test.setTimeout(180_000)
    await page.setViewportSize({ width: shot.width, height: shot.height })
    await resetDemo(page)

    await page.goto('/')
    await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
    await shoot(page, `inicio-${shot.suffix}.png`)

    await page.goto('/nfts/nft-aurora')
    await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()
    await shoot(page, `detalhe-${shot.suffix}.png`)

    await page.goto('/login')
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
    await shoot(page, `login-${shot.suffix}.png`)

    await page.goto('/cadastro')
    await expect(page.getByLabel('Nome', { exact: true })).toBeVisible()
    await shoot(page, `cadastro-${shot.suffix}.png`)

    await login(page, adaEmail, adaPassword)
    await page.evaluate(() => {
      localStorage.setItem(
        'jungle.order-index',
        JSON.stringify({ 'user-ada': ['order-ada-1'] }),
      )
    })

    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-line-edition-aurora-1')).toBeVisible()
    await expect(page.getByTestId('money-total')).toBeVisible()
    await shoot(page, `carrinho-${shot.suffix}.png`)

    await page.goto('/checkout')
    await expect(page.getByLabel('Carteira')).toBeVisible()
    await expect(page.getByTestId('checkout-step')).toHaveText('dados')
    await shoot(page, `pagamento-${shot.suffix}.png`)

    await page.goto('/perfil')
    await expect(page.getByLabel('Senha atual')).toBeVisible()
    await shoot(page, `perfil-${shot.suffix}.png`)

    await page.goto('/carteiras')
    await expect(page.getByText('Principal da Ada')).toBeVisible()
    await shoot(page, `carteiras-${shot.suffix}.png`)

    await page.goto('/favoritos')
    await expect(page.getByTestId('favorite-nft-aurora')).toBeVisible()
    await shoot(page, `favoritos-${shot.suffix}.png`)

    await page.goto('/pedidos')
    await expect(page.getByRole('link', { name: 'order-ada-1' })).toBeVisible()
    await shoot(page, `pedidos-${shot.suffix}.png`)

    await page.goto('/pedidos/order-ada-1')
    await expect(page.getByTestId('order-receipt')).toBeVisible()
    await shoot(page, `recibo-${shot.suffix}.png`)
  })
}
