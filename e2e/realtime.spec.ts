import { expect, type Page, test } from '@playwright/test'

import {
  adaEmail,
  adaPassword,
  biaEmail,
  biaPassword,
  login,
  resetDemo,
} from './auth-helpers'

const auroraPrice = '1.500000000000000000'
const nextPrice = '2.000000000000000000'
const auroraTotal = '1.502000000000000000'
const nextTotal = '2.002000000000000000'

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

async function waitSocket(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.appSocket))
    .toBe('open')
}

async function openCart(page: Page) {
  await page.getByRole('link', { name: 'Carrinho' }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
}

async function dropSocket(page: Page) {
  await page.evaluate(() => {
    const controls = (
      window as Window & { __jungleAppSocket?: { drop: () => void } }
    ).__jungleAppSocket
    if (!controls) {
      throw new Error('socket ausente')
    }
    controls.drop()
  })
}

async function restoreSocket(page: Page) {
  await page.evaluate(() => {
    const controls = (
      window as Window & { __jungleAppSocket?: { restore: () => void } }
    ).__jungleAppSocket
    if (!controls) {
      throw new Error('socket ausente')
    }
    controls.restore()
  })
}

async function isolateStorage(page: Page) {
  await page.addInitScript(() => {
    const storageKey = 'jungle.tab-local'
    const read = (): Record<string, string> => {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) {
        return {}
      }
      return JSON.parse(raw) as Record<string, string>
    }
    const write = (data: Record<string, string>) => {
      sessionStorage.setItem(storageKey, JSON.stringify(data))
    }
    const shim: Storage = {
      get length() {
        return Object.keys(read()).length
      },
      clear() {
        write({})
      },
      getItem(key: string) {
        return read()[key] ?? null
      },
      key(index: number) {
        return Object.keys(read())[index] ?? null
      },
      removeItem(key: string) {
        const data = read()
        delete data[key]
        write(data)
      },
      setItem(key: string, value: string) {
        const data = read()
        data[key] = value
        write(data)
      },
    }
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: shim,
    })
  })
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await resetDemo(page)
})

test('preço do catálogo acompanha nft.updated e não volta atrás', async ({
  page,
}) => {
  await expect(page.getByTestId('nft-card-price-nft-aurora')).toHaveText(
    '1.50 ETH',
  )
  await waitSocket(page)
  await setScenario(page, 'price-change')
  await expect(page.getByTestId('nft-card-price-nft-aurora')).toHaveText(
    '2.00 ETH',
  )
  await setScenario(page, 'price-change')
  await expect(page.getByTestId('nft-card-price-nft-aurora')).toHaveText(
    '2.00 ETH',
  )
})

test('preço do detalhe acompanha nft.updated', async ({ page }) => {
  await page.goto('/nfts/nft-aurora')
  const edition = page.getByRole('group', { name: 'Edição' })
  await expect(edition).toContainText(auroraPrice)
  await waitSocket(page)
  await setScenario(page, 'price-change')
  await expect(edition).toContainText(nextPrice)
  await expect(edition).not.toContainText(auroraPrice)
})

test('carrinho recota quando o preço muda', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await openCart(page)
  await expect(page.getByTestId('line-total-edition-aurora-1')).toHaveText(
    auroraPrice,
  )
  await expect(page.getByTestId('money-total')).toHaveText(auroraTotal)
  await waitSocket(page)
  await setScenario(page, 'price-change')
  await expect(page.getByTestId('line-total-edition-aurora-1')).toHaveText(
    nextPrice,
  )
  await expect(page.getByTestId('money-total')).toHaveText(nextTotal)
  await expect(page.getByTestId('commerce-status')).toHaveText('O preço mudou.')
})

test('visitante recebe nft.updated com a sessão fechada', async ({ page }) => {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.sessionSocket),
    )
    .toBe('closed')
  await waitSocket(page)
  await setScenario(page, 'price-change')
  await expect(page.getByTestId('nft-card-price-nft-aurora')).toHaveText(
    '2.00 ETH',
  )
})

test('estoque esgotado aparece no detalhe e no catálogo', async ({ page }) => {
  await page.goto('/nfts/nft-moss')
  await expect(page.getByText('Edição esgotada')).toHaveCount(0)
  await waitSocket(page)
  await setScenario(page, 'sold-out')
  await expect(page.getByText('Edição esgotada')).toBeVisible()
  await page.goto('/')
  await expect(
    page.getByRole('link', { name: /Moss/ }).getByText('Esgotado'),
  ).toBeVisible()
})

test('estoque esgotado invalida a cotação do carrinho', async ({ page }) => {
  await login(page, biaEmail, biaPassword)
  await openCart(page)
  await expect(page.getByTestId('money-total')).toHaveText(
    '0.252000000000000000',
  )
  await waitSocket(page)
  await setScenario(page, 'sold-out')
  await expect(page.getByRole('alert')).toHaveText('Estoque esgotado.')
  await expect(page.getByText('Edição esgotada')).toBeVisible()
})

test('checkout bloqueia a confirmação enquanto a cotação definitiva atualiza', async ({
  page,
}) => {
  await login(page, adaEmail, adaPassword)
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByTestId('quote-state')).toHaveText('ready')
  const quoteId = await page.getByTestId('quote-id').innerText()
  await expect(page.getByTestId('money-total')).toHaveText(auroraTotal)
  await waitSocket(page)
  await page.evaluate(() => {
    const seen = { blocked: false, hidden: false }
    const read = () => {
      const state = document.querySelector(
        '[data-testid="quote-state"]',
      )?.textContent
      const confirm = [...document.querySelectorAll('button')].some(
        (button) => button.textContent === 'Confirmar compra',
      )
      if (state === 'blocked') {
        seen.blocked = true
      }
      if (state === 'blocked' && !confirm) {
        seen.hidden = true
      }
    }
    const observer = new MutationObserver(read)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    })
    ;(
      window as Window & { __quoteSeen?: { blocked: boolean; hidden: boolean } }
    ).__quoteSeen = seen
  })
  await setScenario(page, 'price-change')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const seen = (
          window as Window & {
            __quoteSeen?: { blocked: boolean; hidden: boolean }
          }
        ).__quoteSeen
        return seen ?? { blocked: false, hidden: false }
      }),
    )
    .toEqual({ blocked: true, hidden: true })
  await expect(page.getByTestId('commerce-status')).toHaveText('O preço mudou.')
  await expect(page.getByTestId('money-total')).toHaveText(nextTotal)
  await expect(page.getByTestId('quote-state')).toHaveText('ready')
  await expect(page.getByTestId('quote-id')).not.toHaveText(quoteId)
  await expect(
    page.getByRole('button', { name: 'Confirmar compra' }),
  ).toBeVisible()
})

test('order.updated fica só com a Ada', async ({ page, context }) => {
  test.setTimeout(60_000)
  await login(page, adaEmail, adaPassword)
  const bia = await context.newPage()
  await isolateStorage(bia)
  await bia.setViewportSize({ width: 1440, height: 900 })
  await login(bia, biaEmail, biaPassword)
  await bia.goto('/pedidos/order-bia-1')
  await expect(bia.getByTestId('order-status')).toHaveText('pending')
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByTestId('quote-state')).toHaveText('ready')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByTestId('order-status')).toHaveText('pending')
  const orderId = await page.getByTestId('order-id').innerText()
  await expect(bia.getByTestId('order-id')).toHaveText('order-bia-1')
  await expect(bia.getByTestId('order-status')).toHaveText('pending')
  await expect(bia.getByText(orderId)).toHaveCount(0)
})

test('logout encerra o listener antes da troca de conta', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await page.goto('/pedidos/order-ada-1')
  await expect(page.getByTestId('order-status')).toHaveText('confirmed')
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.sessionSocket),
    )
    .toBe('open')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.sessionSocket),
    )
    .toBe('closed')
  await login(page, biaEmail, biaPassword)
  await page.goto('/pedidos/order-ada-1')
  await expect(
    page.getByRole('heading', { name: 'Pedido não encontrado.' }),
  ).toBeVisible()
  await page.goto('/pedidos/order-bia-1')
  await expect(page.getByTestId('order-status')).toHaveText('pending')
})

test('recibo confirmado não acompanha o preço ao vivo', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await page.goto('/pedidos/order-ada-1')
  await expect(page.getByTestId('order-status')).toHaveText('confirmed')
  await expect(page.getByTestId('money-total')).toHaveText(
    '1.002000000000000000',
  )
  await waitSocket(page)
  await setScenario(page, 'price-change')
  await expect(page.getByTestId('order-status')).toHaveText('confirmed')
  await expect(page.getByTestId('money-total')).toHaveText(
    '1.002000000000000000',
  )
})

test('reconexão consulta o pedido pending sem novo POST', async ({ page }) => {
  test.setTimeout(60_000)
  await login(page, adaEmail, adaPassword)
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByTestId('quote-state')).toHaveText('ready')
  const posts: string[] = []
  const gets: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (request.method() === 'POST' && url.pathname === '/api/orders') {
      posts.push(request.headers()['idempotency-key'] ?? '')
    }
    if (request.method() === 'GET' && url.pathname.startsWith('/api/orders/')) {
      gets.push(url.pathname)
    }
  })
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByTestId('order-status')).toHaveText('pending')
  const orderId = await page.getByTestId('order-id').innerText()
  expect(posts).toHaveLength(1)
  const getsBefore = gets.length
  await waitSocket(page)
  await dropSocket(page)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.appSocket))
    .toBe('closed')
  await restoreSocket(page)
  await expect.poll(() => gets.length).toBeGreaterThan(getsBefore)
  expect(posts).toHaveLength(1)
  await expect(page.getByTestId('order-id')).toHaveText(orderId)
  await expect(page.getByTestId('order-status')).toHaveText('pending')
})
