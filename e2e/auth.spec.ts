import { expect, test, type Page } from '@playwright/test'

import {
  adaAddress,
  adaEmail,
  adaPassword,
  advanceClock,
  biaAddress,
  biaEmail,
  biaPassword,
  flowViewports,
  login,
  readSession,
  resetDemo,
} from './auth-helpers'

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect.poll(() => readSession(page)).toBeNull()
}

for (const viewport of flowViewports) {
  test.describe(`conta ${viewport.width}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await resetDemo(page)
    })

    test('cadastro, conflito, login inválido, returnTo e refresh', async ({ page }) => {
      await page.goto('/cadastro')
      await page.getByLabel('Nome').fill('Ada')
      await page.getByLabel('E-mail').fill(adaEmail)
      await page.getByLabel('Senha').fill(adaPassword)
      const conflict = page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/register') && res.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Create Profile Button' }).click()
      expect((await conflict).status()).toBe(409)
      await expect(page).toHaveURL(/\/cadastro/)
      await expect(page.getByText('E-mail já cadastrado.')).toBeVisible()
      await expect(page.getByLabel('E-mail')).toHaveAttribute('aria-invalid', 'true')

      await page.getByLabel('Nome').fill('Nova')
      await page.getByLabel('E-mail').fill('nova@demo.jungle')
      await page.getByLabel('Senha').fill('nova-demo-pass')
      let registers = 0
      page.on('request', (request) => {
        if (
          request.method() === 'POST' &&
          request.url().includes('/api/auth/register')
        ) {
          registers += 1
        }
      })
      const created = page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/register') && res.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Create Profile Button' }).click()
      expect((await created).ok()).toBeTruthy()
      expect(registers).toBe(1)
      await expect(page.getByRole('link', { name: 'Nova' })).toBeVisible()

      await logout(page)
      await page.goto('/login')
      await page.getByLabel('E-mail').fill(biaEmail)
      await page.getByLabel('Senha').fill('errada-12')
      const denied = page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/login') && res.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Sign In Button' }).click()
      expect((await denied).status()).toBe(401)
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByRole('alert')).toBeVisible()

      await page.goto('/login?returnTo=/nfts/nft-aurora')
      await page.getByLabel('E-mail').fill(adaEmail)
      await page.getByLabel('Senha').fill(adaPassword)
      await page.getByRole('button', { name: 'Sign In Button' }).click()
      await expect(page).toHaveURL(/\/nfts\/nft-aurora/)

      await logout(page)
      await page.goto('/login?returnTo=https://evil.test')
      await page.getByLabel('E-mail').fill(adaEmail)
      await page.getByLabel('Senha').fill(adaPassword)
      await page.getByRole('button', { name: 'Sign In Button' }).click()
      await expect(page).toHaveURL(/\/$/)
      expect(page.url()).not.toContain('evil')

      const sessionResponse = page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/session') && res.request().method() === 'GET',
      )
      await page.reload()
      expect((await sessionResponse).ok()).toBeTruthy()
      await expect(page.getByRole('link', { name: 'Ada Demo' })).toBeVisible()
    })

    test('expiração pelo relógio do mock, logout com falha e rotas privadas', async ({
      page,
    }) => {
      await login(page, adaEmail, adaPassword)
      const stored = await readSession(page)
      const expiresAt = JSON.parse(stored ?? '').expiresAt as string
      await advanceClock(page, expiresAt)
      const expired = page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/session') && res.request().method() === 'GET',
      )
      await page.goto('/perfil')
      expect((await expired).status()).toBe(401)
      await expect(page).toHaveURL(/\/login/)
      expect(decodeURIComponent(page.url())).toContain('/perfil')
      expect(await readSession(page)).toBeNull()

      await page.evaluate(async () => {
        await fetch('/api/demo/reset', { method: 'POST' })
      })
      await login(page, adaEmail, adaPassword)
      const token = JSON.parse((await readSession(page)) ?? '').token as string
      await page.evaluate(async () => {
        await fetch('/api/demo/failures', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: 500 }),
        })
      })
      let logoutPosts = 0
      let authorization = ''
      page.on('request', (request) => {
        if (
          request.method() === 'POST' &&
          request.url().includes('/api/auth/logout')
        ) {
          logoutPosts += 1
          authorization = request.headers().authorization ?? ''
        }
      })
      await page.getByRole('button', { name: 'Sair' }).click()
      await expect.poll(() => logoutPosts).toBe(1)
      expect(authorization).toBe(`Bearer ${token}`)
      expect(await readSession(page)).toBeNull()
      await expect(page.getByRole('link', { name: 'Ada Demo' })).toHaveCount(0)

      await page.evaluate(async () => {
        await fetch('/api/demo/reset', { method: 'POST' })
        localStorage.removeItem('jungle.session')
      })
      for (const path of ['/perfil', '/carteiras', '/checkout', '/favoritos', '/pedidos']) {
        await page.goto(path)
        await expect(page).toHaveURL(/\/login/)
        expect(decodeURIComponent(page.url())).toContain(path)
      }
    })

    test('troca de conta não mostra carteira, favorito nem pedido da anterior', async ({
      page,
    }) => {
      await login(page, adaEmail, adaPassword)
      await page.goto('/carteiras')
      await expect(page.getByText(adaAddress)).toBeVisible()
      await page.getByRole('button', { name: 'Sair' }).click()
      await expect.poll(() => readSession(page)).toBeNull()
      await login(page, biaEmail, biaPassword)
      await page.goto('/carteiras')
      await expect(page.getByText(biaAddress)).toBeVisible()
      await expect(page.getByText(adaAddress)).toHaveCount(0)
      const isolated = await page.evaluate(async () => {
        const raw = localStorage.getItem('jungle.session')
        const token = JSON.parse(raw ?? '').token as string
        const favorites = await fetch('/api/favorites', {
          headers: { authorization: `Bearer ${token}` },
        })
        const order = await fetch('/api/orders/order-ada-1', {
          headers: { authorization: `Bearer ${token}` },
        })
        return {
          favorites: JSON.stringify(await favorites.json()),
          orderStatus: order.status,
        }
      })
      expect(isolated.favorites).not.toContain('nft-aurora')
      expect([403, 404]).toContain(isolated.orderStatus)
    })
  })
}

test('logout fecha o socket e o 401 atrasado não derruba a conta nova', async ({ page }) => {
  await page.addInitScript(() => {
    const originalOpen = XMLHttpRequest.prototype.open
    const originalSend = XMLHttpRequest.prototype.send
    const held: XMLHttpRequest[] = []
    XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
      const target = this as XMLHttpRequest & { __method?: string; __url?: string }
      target.__method = String(method)
      target.__url = String(url)
      return originalOpen.call(this, method, url, true)
    }
    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const target = this as XMLHttpRequest & { __method?: string; __url?: string }
      const flag = sessionStorage.getItem('hold-profile') === '1'
      if (flag && target.__method === 'GET' && (target.__url ?? '').includes('/api/profile')) {
        held.push(this)
        return
      }
      originalSend.call(this, body ?? null)
    }
    ;(window as Window & { __releaseProfileGet?: () => number }).__releaseProfileGet = () => {
      const xhr = held.shift()
      if (!xhr) {
        return 0
      }
      try {
        originalSend.call(xhr, null)
      } catch {
        return -1
      }
      return 1
    }
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await resetDemo(page)
  await login(page, adaEmail, adaPassword)
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.dataset.sessionSocket),
  ).toBe('open')
  await page.evaluate(() => {
    sessionStorage.setItem('hold-profile', '1')
  })
  await page.goto('/perfil')
  await expect(page.getByTestId('profile-skeleton')).toBeVisible()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect.poll(() => readSession(page)).toBeNull()
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.dataset.sessionSocket),
  ).toBe('closed')
  await login(page, biaEmail, biaPassword)
  await page.evaluate(() => {
    sessionStorage.removeItem('hold-profile')
    const release = (window as Window & { __releaseProfileGet?: () => number }).__releaseProfileGet
    release?.()
  })
  await expect(page.getByRole('link', { name: 'Bia Demo' })).toBeVisible()
  const stored = await readSession(page)
  expect(stored).toContain(biaEmail)
  expect(stored).not.toContain(adaEmail)
})
