import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { adaEmail, adaPassword, login, resetDemo } from './auth-helpers'

const axeViewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const

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

async function expectNoSeriousAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  const serious = results.violations.filter(
    (violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
  )
  expect(serious).toEqual([])
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'preview',
    'Auditoria no build de preview',
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await resetDemo(page)
})

for (const viewport of axeViewports) {
  test(`axe nas rotas principais em ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ ...viewport })

    await page.goto('/')
    await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
    await expectNoSeriousAxe(page)

    await page.goto('/nfts/nft-aurora')
    await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()
    await expectNoSeriousAxe(page)

    await page.goto('/login')
    await expect(page.getByLabel('E-mail')).toBeVisible()
    await expectNoSeriousAxe(page)

    await login(page, adaEmail, adaPassword)
    await page.goto('/carrinho')
    await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
    await expectNoSeriousAxe(page)

    await page.goto('/checkout')
    await expect(
      page.getByRole('heading', { name: 'Pagamento com carteira' }),
    ).toBeVisible()
    await expectNoSeriousAxe(page)
  })
}

test('teclado chega ao erro do login e o diálogo devolve o foco', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/login')
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  })

  let reachedEmail = false
  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.press('Tab')
    reachedEmail = await page.locator('#email').evaluate((element) => {
      return element === document.activeElement
    })
    if (reachedEmail) {
      break
    }
  }
  expect(reachedEmail).toBe(true)

  await page.keyboard.press('Enter')
  await expect(page.locator('#email')).toBeFocused()
  await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#email')).toHaveAttribute(
    'aria-describedby',
    'email-error',
  )
  await expect(page.locator('#email-error')).toBeVisible()

  await page.goto('/')
  await page.getByRole('link', { name: 'Entrar' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar' }).click()
  await expect(page.locator('#header-login')).toBeFocused()
})

test('zoom 200% mantém busca, compra e fechar diálogo alcançáveis', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })

  const search = page.getByRole('searchbox', { name: 'Busca' })
  await search.scrollIntoViewIfNeeded()
  await expect(search).toBeVisible()
  await search.focus()
  await expect(search).toBeFocused()
  expect(await clipped(search)).toBe(false)

  await page.goto('/nfts/nft-aurora')
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  const buy = page.getByRole('button', { name: 'Comprar NFT' })
  await buy.scrollIntoViewIfNeeded()
  await expect(buy).toBeVisible()
  await expect(buy).toBeEnabled()
  expect(await clipped(buy)).toBe(false)

  await page.goto('/login')
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2'
  })
  const close = page.getByRole('button', { name: 'Fechar' })
  await close.scrollIntoViewIfNeeded()
  await expect(close).toBeVisible()
  expect(await clipped(close)).toBe(false)
  await close.click()
  await expect(page.locator('#header-login')).toBeFocused()
})

test('mutação e preço em tempo real entram na live region', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/nfts/nft-aurora')
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  const added = page.getByTestId('commerce-status')
  await expect(added).toHaveAttribute('aria-live', 'polite')
  await expect(added).toHaveText('Adicionado ao carrinho.')

  await login(page, adaEmail, adaPassword)
  await page.goto('/carrinho')
  await expect(page.getByTestId('money-total')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.appSocket))
    .toBe('open')
  await setScenario(page, 'price-change')
  const price = page.getByTestId('commerce-status')
  await expect(price).toHaveAttribute('aria-live', 'polite')
  await expect(price).toHaveText('O preço mudou.')
})

async function clipped(locator: ReturnType<Page['getByRole']>) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return true
    }
    let node = element.parentElement
    while (node) {
      const style = getComputedStyle(node)
      const hidden =
        style.overflow === 'hidden' ||
        style.overflowX === 'hidden' ||
        style.overflowY === 'hidden'
      if (hidden) {
        const parent = node.getBoundingClientRect()
        if (
          rect.left < parent.left - 1 ||
          rect.top < parent.top - 1 ||
          rect.right > parent.right + 1 ||
          rect.bottom > parent.bottom + 1
        ) {
          return true
        }
      }
      node = node.parentElement
    }
    return false
  })
}
