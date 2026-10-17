import { expect, type Page, test } from '@playwright/test'

import {
  adaEmail,
  adaPassword,
  advanceClock,
  biaEmail,
  biaPassword,
  login,
  readSession,
  resetDemo,
  submitLogin,
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
  await expect(
    page.getByRole('button', { name: 'Confirm Button' }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByTestId('quote-definitive')).toHaveText(
    'Cotação definitiva',
  )
  await expect(page.getByTestId('quote-state')).toHaveText('ready')
}

function watchQuotes(page: Page) {
  const quotes: {
    quoteId: string
    expiresAt: string
    total: string
    definitive: boolean
  }[] = []
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (
      !response.ok() ||
      response.request().method() !== 'POST' ||
      url.pathname !== '/api/quotes'
    ) {
      return
    }
    void response.json().then(
      (body: {
        quoteId?: string
        expiresAt?: string
        total?: string
        definitive?: boolean
      }) => {
        if (
          body.quoteId &&
          body.expiresAt &&
          body.total &&
          typeof body.definitive === 'boolean'
        ) {
          quotes.push({
            quoteId: body.quoteId,
            expiresAt: body.expiresAt,
            total: body.total,
            definitive: body.definitive,
          })
        }
      },
      () => undefined,
    )
  })
  return quotes
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
  await expect(page.getByTestId('commerce-status')).toContainText(
    'Falha simulada',
  )
})

test('visitante mantém o item e o login não duplica a linha', async ({
  page,
}) => {
  await page.goto('/nfts/nft-aurora')
  await page.getByRole('button', { name: 'Compra' }).click()
  await expect(page.getByTestId('commerce-status')).toHaveText(
    'Adicionado ao carrinho.',
  )
  await openCart(page)
  await expect(page.getByTestId('cart-line-edition-aurora-1')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue(
    '1',
  )
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue(
    '1',
  )
  await page.getByRole('button', { name: 'Checkout Button' }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('E-mail').fill(adaEmail)
  await page.getByLabel('Senha').fill(adaPassword)
  await page.getByRole('button', { name: 'Sign In Button' }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await openCart(page)
  await expect(page.getByTestId('cart-line-edition-aurora-1')).toHaveCount(1)
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue(
    '2',
  )
})

test('cupom válido, inválido, expirado e removido', async ({ page }) => {
  await page.goto('/nfts/nft-moss')
  await page.getByRole('button', { name: 'Compra' }).click()
  await openCart(page)
  await expect(page.getByTestId('money-discount')).toHaveText(
    '0.000000000000000000',
  )
  await expect(page.getByTestId('money-total')).toHaveText(
    '0.252000000000000000',
  )
  await expect(page.getByTestId('quote-definitive')).toHaveText(
    'Cotação preliminar',
  )

  await page.getByRole('textbox', { name: 'Cupom' }).fill('GREEN10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByTestId('money-discount')).toHaveText(
    '0.025000000000000000',
  )
  await expect(page.getByTestId('money-total')).toHaveText(
    '0.227000000000000000',
  )

  await page.getByRole('textbox', { name: 'Cupom' }).fill('NOPE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Cupom inválido.')

  await page.getByRole('button', { name: 'Remover cupom' }).click()
  await expect(page.getByTestId('money-discount')).toHaveText(
    '0.000000000000000000',
  )
  await expect(page.getByTestId('money-total')).toHaveText(
    '0.252000000000000000',
  )

  await page.getByRole('textbox', { name: 'Cupom' }).fill('OLD20')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Cupom expirado.')
})

test('estoque insuficiente e edição esgotada', async ({ page }) => {
  await login(page, biaEmail, biaPassword)
  await page.goto('/nfts/nft-moss')
  await page.getByRole('button', { name: 'Compra' }).click()
  await expect(page.getByTestId('commerce-status')).toHaveText(
    'Quantidade acima do estoque.',
  )
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
  await expect(
    page.getByRole('button', { name: 'Confirm Button' }),
  ).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveText(
    'Conexão da carteira inválida.',
  )
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByTestId('wallet-connection')).toContainText('connected')
  await expect(
    page.getByRole('button', { name: 'Confirm Button' }),
  ).toBeVisible()
})

test('voltar ao checkout e mudar a quantidade geram outra cotação', async ({
  page,
}) => {
  const quotes = watchQuotes(page)
  const definitive = () => quotes.filter((item) => item.definitive)
  await login(page, adaEmail, adaPassword)
  await reviewCheckout(page)
  await expect.poll(() => definitive().length).toBe(1)
  const first = definitive()[0]
  if (!first) {
    throw new Error('cotação ausente')
  }
  await openCart(page)
  await page.goto('/checkout?step=revisao')
  await expect.poll(() => definitive().length).toBe(2)
  await expect(page.getByTestId('quote-id')).not.toHaveText(first.quoteId)
  await expect(page.getByTestId('quote-state')).toHaveText('ready')
  const second = definitive()[1]
  if (!second) {
    throw new Error('segunda cotação ausente')
  }
  await openCart(page)
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue(
    '2',
  )
  await page.goto('/checkout?step=revisao')
  await expect.poll(() => definitive().at(-1)?.total).not.toBe(second.total)
  await expect(page.getByTestId('quote-state')).toHaveText('ready')
})

test('cotação vencida no relógio do mock bloqueia a confirmação até a recotação', async ({
  page,
}) => {
  const quotes = watchQuotes(page)
  const definitive = () => quotes.filter((item) => item.definitive)
  await login(page, adaEmail, adaPassword)
  await reviewCheckout(page)
  await expect.poll(() => definitive().length).toBe(1)
  const current = definitive()[0]
  if (!current) {
    throw new Error('cotação ausente')
  }
  await advanceClock(page, current.expiresAt)
  await page.getByRole('button', { name: 'Confirm Button' }).click()
  await expect(page.getByTestId('commerce-status')).toHaveText(
    'A cotação expirou.',
  )
  await expect
    .poll(async () => {
      const id = await page.getByTestId('quote-id').innerText()
      const state = await page.getByTestId('quote-state').innerText()
      if (id === current.quoteId && state === 'ready') {
        return 'stale-ready'
      }
      if (id !== current.quoteId && state === 'ready') {
        return 'fresh-ready'
      }
      return 'blocked'
    })
    .toBe('fresh-ready')
  expect(definitive().length).toBeGreaterThan(1)
})

test('timeout, refresh sem POST e retry manual usam a mesma chave', async ({
  page,
}) => {
  await login(page, adaEmail, adaPassword)
  await reviewCheckout(page)
  await setScenario(page, 'timeout')
  await page.getByRole('button', { name: 'Confirm Button' }).click()
  await expect(page.getByTestId('commerce-status')).toHaveText(
    'A resposta não chegou. Tentar de novo.',
    { timeout: 10_000 },
  )
  const key = await page.evaluate(() => {
    const session = JSON.parse(
      localStorage.getItem('jungle.session') ?? '{}',
    ) as {
      user?: { id?: string }
    }
    const map = JSON.parse(
      localStorage.getItem('jungle.order-attempt') ?? '{}',
    ) as Record<string, { key: string; quoteId: string; expectedTotal: string }>
    const userId = session.user?.id ?? ''
    const stored = map[userId]
    return {
      userId,
      key: stored?.key ?? '',
      quoteId: stored?.quoteId ?? '',
      total: stored?.expectedTotal ?? '',
    }
  })
  const posts: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (request.method() === 'POST' && url.pathname === '/api/orders') {
      posts.push(request.headers()['idempotency-key'] ?? '')
    }
  })
  await page.reload()
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByTestId('pending-attempt')).toBeVisible()
  await expect(page.getByTestId('pending-key')).toHaveText(key.key)
  await expect(page.getByTestId('pending-quote')).toHaveText(key.quoteId)
  await expect(page.getByTestId('pending-total')).toHaveText(key.total)
  await expect(
    page.getByRole('button', { name: 'Confirm Button' }),
  ).toHaveCount(0)
  expect(posts).toEqual([])
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByTestId('order-status')).toHaveText('pending')
  expect(posts).toEqual([key.key])
  const orderId = await page.getByTestId('order-id').innerText()
  const replay = await page.evaluate(async (attempt) => {
    const session = JSON.parse(
      localStorage.getItem('jungle.session') ?? '{}',
    ) as {
      token?: string
    }
    const same = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.token ?? ''}`,
        'content-type': 'application/json',
        'idempotency-key': attempt.key,
      },
      body: JSON.stringify({
        quoteId: attempt.quoteId,
        expectedTotal: attempt.total,
      }),
    })
    const conflict = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${session.token ?? ''}`,
        'content-type': 'application/json',
        'idempotency-key': attempt.key,
      },
      body: JSON.stringify({
        quoteId: attempt.quoteId,
        expectedTotal: '9.000000000000000000',
      }),
    })
    return {
      sameId: ((await same.json()) as { id?: string }).id ?? '',
      conflict: conflict.status,
    }
  }, key)
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
    const session = JSON.parse(
      localStorage.getItem('jungle.session') ?? '{}',
    ) as {
      user?: { id?: string }
    }
    const map = JSON.parse(
      localStorage.getItem('jungle.order-attempt') ?? '{}',
    ) as Record<string, { key: string; quoteId: string; expectedTotal: string }>
    const userId = session.user?.id ?? ''
    return map[userId]
  })
  await page.getByRole('button', { name: 'Sair' }).click()
  await login(page, biaEmail, biaPassword)
  await page.goto('/favoritos')
  await expect(page.getByTestId('favorite-nft-moss')).toBeVisible()
  await expect(page.getByTestId('favorite-nft-aurora')).toHaveCount(0)
  await page.goto(`/pedidos/${orderId}`)
  await expect(
    page.getByRole('heading', { name: 'Pedido não encontrado.' }),
  ).toBeVisible()
  await page.goto('/pedidos/order-ada-1')
  await expect(
    page.getByRole('heading', { name: 'Pedido não encontrado.' }),
  ).toBeVisible()
  const foreign = await page.evaluate(async (attempt) => {
    const session = JSON.parse(
      localStorage.getItem('jungle.session') ?? '{}',
    ) as {
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
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  )
  expect(overflow).toBe(true)
})

test('expiração no checkout devolve o rascunho', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await page.goto('/checkout')
  await page.getByLabel('Rede').selectOption('demo-l2')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByTestId('checkout-step')).toHaveText('revisao')
  const stored = await readSession(page)
  const expiresAt = JSON.parse(stored ?? '').expiresAt as string
  await advanceClock(page, expiresAt)
  await page.reload()
  await expect(page).toHaveURL(/\/login/)
  const returnTo = decodeURIComponent(page.url())
  expect(returnTo).toContain('/checkout')
  expect(returnTo).toContain('revisao')
  await submitLogin(page, adaEmail, adaPassword)
  await expect(page).toHaveURL(/\/checkout/)
  await expect(page.getByTestId('checkout-step')).toHaveText('revisao')
  await expect(page.getByLabel('Rede')).toHaveValue('demo-l2')
})

test('confirmação remove só a quantidade comprada', async ({ page }) => {
  await login(page, adaEmail, adaPassword)
  await openCart(page)
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue(
    '2',
  )
  await reviewCheckout(page)
  const patched = await page.evaluate(async () => {
    const session = JSON.parse(
      localStorage.getItem('jungle.session') ?? '{}',
    ) as {
      token?: string
    }
    const cartResponse = await fetch('/api/cart', {
      headers: { authorization: `Bearer ${session.token ?? ''}` },
    })
    const cart = (await cartResponse.json()) as {
      items?: { id: string; editionId: string; quantity: number }[]
    }
    const item = cart.items?.find(
      (entry) => entry.editionId === 'edition-aurora-1',
    )
    if (!item) {
      return 0
    }
    const response = await fetch(`/api/cart/items/${item.id}`, {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${session.token ?? ''}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ quantity: 3 }),
    })
    return response.status
  })
  expect(patched).toBe(200)
  await setScenario(page, 'payment-confirmed')
  await page.getByRole('button', { name: 'Confirm Button' }).click()
  await expect(page.getByTestId('order-receipt')).toBeVisible()
  await openCart(page)
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue(
    '1',
  )
})

test('carrinho reserva o resumo, falha e recupera', async ({ page }) => {
  test.setTimeout(60_000)
  await login(page, adaEmail, adaPassword)
  await page.evaluate(async () => {
    await fetch('/api/demo/failures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ latencyMs: 2000 }),
    })
  })
  await page.goto('/carrinho')
  await expect(page.getByTestId('cart-skeleton')).toBeVisible()
  await expect(page.getByTestId('cart-line-edition-aurora-1')).toBeVisible()
  await expect(page.getByTestId('cart-summary-skeleton')).toBeVisible()
  await expect(page.getByTestId('money-total')).toBeVisible()

  await page.evaluate(async () => {
    await fetch('/api/demo/failures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 500 }),
    })
  })
  await page.reload()
  await expect(page.getByText('Falha simulada.')).toBeVisible()
  await page.evaluate(async () => {
    await fetch('/api/demo/failures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
  })
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await expect(page.getByTestId('cart-line-edition-aurora-1')).toBeVisible()
})
