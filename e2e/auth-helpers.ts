import { expect, type Page } from '@playwright/test'

export const adaEmail = 'ada@demo.jungle'
export const adaPassword = 'ada-demo-pass'
export const biaEmail = 'bia@demo.jungle'
export const biaPassword = 'bia-demo-pass'
export const adaAddress = `0x${'ada'.padEnd(39, '0')}1`
export const biaAddress = `0x${'bb'.padEnd(39, '0')}1`

export const flowViewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const

export async function resetDemo(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('searchbox', { name: 'Busca' })).toBeVisible()
  const status = await page.evaluate(async () => {
    const response = await fetch('/api/demo/reset', { method: 'POST' })
    return response.status
  })
  expect(status).toBe(200)
  await page.evaluate(() => localStorage.removeItem('jungle.session'))
  await page.goto('/')
  await expect(page.getByRole('searchbox', { name: 'Busca' })).toBeVisible()
}

export async function submitLogin(page: Page, email: string, password: string) {
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(password)
  const response = page.waitForResponse(
    (res) =>
      res.url().includes('/api/auth/login') && res.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Sign In Button' }).click()
  expect((await response).ok()).toBeTruthy()
  await expect(page).not.toHaveURL(/\/login/)
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await submitLogin(page, email, password)
}

export async function readSession(page: Page) {
  return page.evaluate(() => localStorage.getItem('jungle.session'))
}

export async function advanceClock(page: Page, expiresAt: string) {
  const later = new Date(Date.parse(expiresAt) + 1000).toISOString()
  const status = await page.evaluate(async (now) => {
    const response = await fetch('/api/demo/clock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ now }),
    })
    return response.status
  }, later)
  expect(status).toBe(200)
}
