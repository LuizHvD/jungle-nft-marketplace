import { expect, test } from '@playwright/test'

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

for (const viewport of flowViewports) {
  test.describe(`perfil e carteiras ${viewport.width}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await resetDemo(page)
      await login(page, adaEmail, adaPassword)
    })

    test('senha atual incorreta permanece autenticada e a senha nova entra', async ({
      page,
    }) => {
      await page.goto('/perfil')
      await page.getByLabel('Senha atual').fill('errada-12')
      await page.getByLabel('Senha nova').fill('ada-nova-pass')
      const denied = page.waitForResponse(
        (res) =>
          res.url().includes('/api/profile/password') &&
          res.request().method() === 'PATCH',
      )
      await page.getByRole('button', { name: 'Alterar senha' }).click()
      expect((await denied).status()).toBe(401)
      await expect(page.getByLabel('Senha atual')).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByText('Senha atual inválida.')).toBeVisible()
      await expect(page).toHaveURL(/\/perfil/)
      await expect(page.getByRole('link', { name: 'Ada Demo' })).toBeVisible()
      expect(await readSession(page)).toContain(adaEmail)

      await page.getByLabel('Senha atual').fill(adaPassword)
      await page.getByLabel('Senha nova').fill('ada-nova-pass')
      const changed = page.waitForResponse(
        (res) =>
          res.url().includes('/api/profile/password') &&
          res.request().method() === 'PATCH',
      )
      await page.getByRole('button', { name: 'Alterar senha' }).click()
      expect((await changed).status()).toBe(204)
      await page.getByRole('button', { name: 'Sair' }).click()
      await expect.poll(() => readSession(page)).toBeNull()

      await page.goto('/login')
      await page.getByLabel('E-mail').fill(adaEmail)
      await page.getByLabel('Senha').fill(adaPassword)
      const oldPassword = page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth/login') && res.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Sign In Button' }).click()
      expect((await oldPassword).status()).toBe(401)
      await expect(page).toHaveURL(/\/login/)

      await page.getByLabel('Senha').fill('ada-nova-pass')
      await page.getByRole('button', { name: 'Sign In Button' }).click()
      await expect(page.getByRole('link', { name: 'Ada Demo' })).toBeVisible()
    })

    test('nome e avatar sobrevivem ao reload', async ({ page }) => {
      await page.goto('/perfil')
      await page.getByRole('form', { name: 'Nome' }).getByLabel('Nome').fill('Ada Atual')
      await page.getByRole('button', { name: 'Salvar nome' }).click()
      await expect(page.getByRole('link', { name: 'Ada Atual' })).toBeVisible()
      await page.getByRole('button', { name: 'Avatar primary' }).click()
      await expect(page.getByRole('button', { name: 'Avatar primary' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await page.reload()
      await expect(page.getByRole('link', { name: 'Ada Atual' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Avatar primary' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    test('carteira valida, grava, edita e conecta', async ({ page }) => {
      await page.goto('/carteiras')
      const form = page.getByRole('form', { name: 'Nova carteira' })
      await form.getByLabel('Rótulo').fill('Ruim')
      await form.getByLabel('Endereço').fill('0x123')
      await form.getByRole('button', { name: 'Cadastrar carteira' }).click()
      await expect(form.getByLabel('Endereço')).toHaveAttribute('aria-invalid', 'true')
      const describedBy = await form.getByLabel('Endereço').getAttribute('aria-describedby')
      expect(describedBy).toBeTruthy()
      await expect(page.locator(`#${describedBy}`)).not.toBeEmpty()

      const address = `0x${'c'.repeat(40)}`
      await form.getByLabel('Rótulo').fill('Secundária')
      await form.getByLabel('Endereço').fill(address)
      await form.getByLabel('Papel').selectOption('secondary')
      const created = page.waitForResponse(
        (res) => res.url().endsWith('/api/wallets') && res.request().method() === 'POST',
      )
      await form.getByRole('button', { name: 'Cadastrar carteira' }).click()
      expect((await created).ok()).toBeTruthy()
      const row = page.locator('article').filter({ hasText: address })
      await row.getByLabel('Rótulo').fill('Secundária editada')
      await row.getByRole('button', { name: 'Salvar carteira' }).click()
      await expect(row).toContainText('Secundária editada')
      await row.getByLabel('Rede').selectOption('demo-mainnet')
      await row.getByRole('button', { name: 'connect', exact: true }).click()
      await expect(row).toContainText(' connected')
      await page.reload()
      const saved = page.locator('article').filter({ hasText: address })
      await expect(saved).toContainText('Secundária editada')
      await expect(saved).toContainText(' connected')
      await saved.getByRole('button', { name: 'reject', exact: true }).click()
      await expect(saved).toContainText('rejected')
      await page.reload()
      const rejected = page.locator('article').filter({ hasText: address })
      await expect(rejected).toContainText('rejected')
      await rejected.getByRole('button', { name: 'disconnect', exact: true }).click()
      await expect(rejected).toContainText('disconnected')
      await page.reload()
      await expect(page.locator('article').filter({ hasText: address })).toContainText(
        'disconnected',
      )
    })

    test('a outra conta não vê o endereço da Ada', async ({ page }) => {
      await page.goto('/carteiras')
      await expect(page.getByText(adaAddress)).toBeVisible()
      await page.getByRole('button', { name: 'Sair' }).click()
      await expect.poll(() => readSession(page)).toBeNull()
      await login(page, biaEmail, biaPassword)
      await page.goto('/carteiras')
      await expect(page.getByText(biaAddress)).toBeVisible()
      await expect(page.getByText(adaAddress)).toHaveCount(0)
    })
  })
}

test('senha com sessão vencida desloga', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await resetDemo(page)
  await login(page, adaEmail, adaPassword)
  await page.goto('/perfil')
  await page.getByLabel('Senha atual').fill(adaPassword)
  await page.getByLabel('Senha nova').fill('ada-nova-pass')
  const stored = await readSession(page)
  await advanceClock(page, JSON.parse(stored ?? '').expiresAt as string)
  const expired = page.waitForResponse(
    (res) =>
      res.url().includes('/api/profile/password') && res.request().method() === 'PATCH',
  )
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  const body = await (await expired).json()
  expect(body.code).toBe('SESSION_EXPIRED')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Senha atual inválida.')).toHaveCount(0)
  expect(await readSession(page)).toBeNull()
})

test('cadastro e senha não repetem um POST que falhou', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await resetDemo(page)
  await page.evaluate(async () => {
    await fetch('/api/demo/failures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 500 }),
    })
  })
  await page.goto('/cadastro')
  await page.getByLabel('Nome').fill('Nova')
  await page.getByLabel('E-mail').fill('nova@demo.jungle')
  await page.getByLabel('Senha').fill('nova-demo-pass')
  let registers = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/auth/register')) {
      registers += 1
    }
  })
  await page.getByRole('button', { name: 'Create Profile Button' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect.poll(() => registers).toBe(1)
  await expect(page).toHaveURL(/\/cadastro/)

  await page.evaluate(async () => {
    await fetch('/api/demo/reset', { method: 'POST' })
    localStorage.removeItem('jungle.session')
  })
  await login(page, adaEmail, adaPassword)
  await page.goto('/perfil')
  await expect(page.getByLabel('Senha atual')).toBeVisible()
  await page.evaluate(async () => {
    await fetch('/api/demo/failures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 500 }),
    })
  })
  await page.getByLabel('Senha atual').fill(adaPassword)
  await page.getByLabel('Senha nova').fill('ada-nova-pass')
  let patches = 0
  page.on('request', (request) => {
    if (
      request.method() === 'PATCH' &&
      request.url().includes('/api/profile/password')
    ) {
      patches += 1
    }
  })
  await page.getByRole('button', { name: 'Alterar senha' }).click()
  await expect.poll(() => patches).toBe(1)
  await expect(page).toHaveURL(/\/perfil/)
  expect(await readSession(page)).toContain(adaEmail)
})

test('perfil e carteiras não estouram em 390', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await resetDemo(page)
  await login(page, adaEmail, adaPassword)
  for (const path of ['/perfil', '/carteiras']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const width = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(width).toBeLessThanOrEqual(390)
  }
})
