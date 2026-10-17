import { expect, type Page, test } from '@playwright/test'

import {
  adaEmail,
  adaPassword,
  biaEmail,
  biaPassword,
  login,
  resetDemo,
} from './auth-helpers'

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

async function openCart(page: Page) {
  await page.getByRole('link', { name: 'Cart' }).click()
  await expect(page.getByRole('heading', { name: 'Carrinho' })).toBeVisible()
}

async function reviewCheckout(page: Page) {
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Confirm Button' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByTestId('quote-definitive')).toHaveText('Cotação definitiva')
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await resetDemo(page)
})

test('favorito persiste e desfaz quando a mutation falha', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await page.goto('/favoritos')
  await expect(page.getByTestId('favorite-nft-aurora')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('favorite-nft-aurora')).toBeVisible()

  await page.goto('/nfts/nft-moss')
  const favorite = page.getByRole('button', { name: 'Favoritar' })
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await setScenario(page, 'transient')
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('commerce-status')).toContainText('Falha simulada')
})

test('visitante mantém o item e o login não duplica a linha', async ({ page }) => {
  await page.goto('/nfts/nft-aurora')
  await page.getByRole('button', { name: 'Compra' }).click()
  await expect(page.getByTestId('commerce-status')).toHaveText('Adicionado ao carrinho.')
  await openCart(page)
  await expect(page.getByTestId('cart-line-edition-aurora-1')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue('1')
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue('1')
  await page.getByRole('button', { name: 'Checkout Button' }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('E-mail').fill(adaEmail)
  await page.getByLabel('Senha').fill(adaPassword)
  await page.getByRole('button', { name: 'Sign In Button' }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await openCart(page)
  await expect(page.getByTestId('cart-line-edition-aurora-1')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue('2')
})

test('cupom válido, inválido, expirado e removido', async ({ page }) => {
  await page.goto('/nfts/nft-moss')
  await page.getByRole('button', { name: 'Compra' }).click()
  await openCart(page)
  await expect(page.getByTestId('money-discount')).toHaveText('0.000000000000000000')
  await expect(page.getByTestId('money-total')).toHaveText('0.252000000000000000')
  await expect(page.getByTestId('quote-definitive')).toHaveText('Cotação preliminar')

  await page.getByRole('textbox', { name: 'Cupom' }).fill('GREEN10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByTestId('money-discount')).toHaveText('0.025000000000000000')
  await expect(page.getByTestId('money-total')).toHaveText('0.227000000000000000')

  await page.getByRole('textbox', { name: 'Cupom' }).fill('NOPE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Cupom inválido.')

  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(page.getByTestId('money-discount')).toHaveText('0.000000000000000000')
  await expect(page.getByTestId('money-total')).toHaveText('0.252000000000000000')

  await page.getByRole('textbox', { name: 'Cupom' }).fill('OLD20')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Cupom expirado.')
})

test('estoque insuficiente e edição esgotada', async ({ page }) => {
  await login(page, biaEmail, biaPassword)
  await page.goto('/nfts/nft-moss')
  await page.getByRole('button', { name: 'Compra' }).click()
  await expect(page.getByTestId('commerce-status')).toHaveText('Quantidade acima do estoque.')
  await setScenario(page, 'sold-out')
  await openCart(page)
  await expect(page.getByRole('alert')).toHaveText('Estoque esgotado.')
})

test('compra confirmada congela o recibo', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await reviewCheckout(page)
  const total = await page.getByTestId('money-total').innerText()
  await setScenario(page, 'payment-confirmed')
  await page.getByRole('button', { name: 'Confirm Button' }).click()
  await expect(page.getByTestId('order-receipt')).toBeVisible()
  await expect(page.getByTestId('order-status')).toHaveText('confirmed')
  await expect(page.getByTestId('money-total')).toHaveText(total)
  const orderId = await page.getByTestId('order-id').innerText()
  await setScenario(page, 'price-change')
  await page.reload()
  await expect(page.getByTestId('order-status')).toHaveText('confirmed')
  await expect(page.getByTestId('money-total')).toHaveText(total)
  await openCart(page)
  await expect(page.getByText('Carrinho vazio')).toBeVisible()
  await page.goto('/pedidos')
  await expect(page.getByRole('link', { name: orderId })).toBeVisible()
})

test('pagamento recusado preserva o carrinho', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await reviewCheckout(page)
  await setScenario(page, 'payment-declined')
  await page.getByRole('button', { name: 'Confirm Button' }).click()
  await expect(page.getByTestId('order-status')).toHaveText('declined')
  await expect(page.getByTestId('order-receipt')).toHaveCount(0)
  await expect(page.getByText('Recibo indisponível.')).toBeVisible()
  await openCart(page)
  await expect(page.getByTestId('cart-line-edition-aurora-1')).toBeVisible()
})

test('carteira desconectada impede o envio', async ({ page }) => {
  await login(page, biaEmail, biaPassword)
  await page.goto('/checkout')
  await page.getByLabel('Rede').selectOption('demo-l2')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('button', { name: 'Confirm Button' })).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveText('Conexão da carteira inválida.')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByTestId('wallet-connection')).toContainText('connected')
  await expect(page.getByRole('button', { name: 'Confirm Button' })).toBeVisible()
})

test('timeout, refresh e conflito reutilizam a mesma chave', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await reviewCheckout(page)
  await setScenario(page, 'timeout')
  await page.getByRole('button', { name: 'Confirm Button' }).click()
  await expect(page.getByTestId('commerce-status')).toHaveText(
    'A resposta não chegou. Tentar de novo.',
    { timeout: 10_000 },
  )
  const key = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem('jungle.session') ?? '{}') as {
      user?: { id?: string }
    }
    const map = JSON.parse(localStorage.getItem('jungle.order-attempt') ?? '{}') as Record<
      string,
      { key: string; expectedTotal: string }
    >
    const userId = session.user?.id ?? ''
    return { userId, key: map[userId]?.key ?? '', total: map[userId]?.expectedTotal ?? '' }
  })
  await page.reload()
  await expect(page).toHaveURL(/\/pedidos\//)
  await expect(page.getByTestId('order-status')).toHaveText('pending')
  const orderId = await page.getByTestId('order-id').innerText()
  const replay = await page.evaluate(async (attempt) => {
    const session = JSON.parse(localStorage.getItem('jungle.session') ?? '{}') as {
      token?: string
    }
    const map = JSON.parse(localStorage.getItem('jungle.order-attempt') ?? '{}') as Record<
      string,
      { key: string; quoteId: string; expectedTotal: string }
    >
    const stored = map[attempt.userId]
    const same = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.token ?? ''}`,
        'content-type': 'application/json',
        'idempotency-key': stored?.key ?? '',
      },
      body: JSON.stringify({
        quoteId: stored?.quoteId,
        expectedTotal: stored?.expectedTotal,
      }),
    })
    const conflict = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.token ?? ''}`,
        'content-type': 'application/json',
        'idempotency-key': stored?.key ?? '',
      },
      body: JSON.stringify({
        quoteId: stored?.quoteId,
        expectedTotal: '9.000000000000000000',
      }),
    })
    return {
      key: stored?.key ?? '',
      sameId: ((await same.json()) as { id?: string }).id ?? '',
      conflict: conflict.status,
    }
  }, key)
  expect(replay.key).toBe(key.key)
  expect(replay.sameId).toBe(orderId)
  expect(replay.conflict).toBe(409)
})

test('clique duplo envia um único pedido', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await reviewCheckout(page)
  await setScenario(page, 'slow')
  const posts: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (request.method() === 'POST' && url.pathname === '/api/orders') {
      posts.push(url.pathname)
    }
  })
  const confirm = page.getByRole('button', { name: 'Confirm Button' })
  await confirm.click()
  await confirm.click({ force: true }).catch(() => undefined)
  await expect(page.getByTestId('order-status')).toHaveText('pending')
  expect(posts).toHaveLength(1)
})

test('Bia não vê favorito nem pedido da Ada', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await reviewCheckout(page)
  await page.getByRole('button', { name: 'Confirm Button' }).click()
  await expect(page.getByTestId('order-status')).toHaveText('pending')
  const orderId = await page.getByTestId('order-id').innerText()
  const leaked = await page.evaluate(async () => {
    const session = JSON.parse(localStorage.getItem('jungle.session') ?? '{}') as {
      user?: { id?: string }
    }
    const map = JSON.parse(localStorage.getItem('jungle.order-attempt') ?? '{}') as Record<
      string,
      { key: string; quoteId: string; expectedTotal: string }
    >
    const userId = session.user?.id ?? ''
    return map[userId]
  })
  await page.getByRole('button', { name: 'Sair' }).click()
  await login(page, biaEmail, biaPassword)
  await page.goto('/favoritos')
  await expect(page.getByTestId('favorite-nft-moss')).toBeVisible()
  await expect(page.getByTestId('favorite-nft-aurora')).toHaveCount(0)
  await page.goto(`/pedidos/${orderId}`)
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado.' })).toBeVisible()
  await page.goto('/pedidos/order-ada-1')
  await expect(page.getByRole('heading', { name: 'Pedido não encontrado.' })).toBeVisible()
  const foreign = await page.evaluate(async (attempt) => {
    const session = JSON.parse(localStorage.getItem('jungle.session') ?? '{}') as {
      token?: string
    }
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.token ?? ''}`,
        'content-type': 'application/json',
        'idempotency-key': attempt.key,
      },
      body: JSON.stringify({
        quoteId: attempt.quoteId,
        expectedTotal: attempt.expectedTotal,
      }),
    })
    const body = await response.text()
    return { status: response.status, body }
  }, leaked)
  expect(foreign.body).not.toContain(orderId)
  expect(foreign.status).not.toBe(200)
})

test('checkout cabe na largura mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, adaEmail, adaPassword)
  await page.goto('/checkout')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
  expect(overflow).toBe(true)
})
