import { expect, test, type Page } from '@playwright/test'

const flowViewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
] as const

async function resetCatalog(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('searchbox', { name: 'Busca' })).toBeVisible()
  const reset = await page.evaluate(async () => {
    const response = await fetch('/api/demo/reset', { method: 'POST' })
    return response.status
  })
  expect(reset).toBe(200)
  await page.reload()
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
}

async function openFilters(page: Page) {
  const availability = page.getByLabel('Disponibilidade')
  if (await availability.isVisible()) {
    return
  }
  await page.getByRole('button', { name: 'Iconly/Curved/Filter' }).click()
  await expect(availability).toBeVisible()
}

function searchBox(page: Page) {
  return page.getByRole('searchbox', { name: 'Busca' })
}

function nftRequest(
  url: string,
  predicate: (params: URLSearchParams) => boolean,
) {
  const parsed = new URL(url)
  return parsed.pathname === '/api/nfts' && predicate(parsed.searchParams)
}

for (const viewport of flowViewports) {
  test(`busca, filtros, ordem, página e histórico em ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ ...viewport })
    await resetCatalog(page)

    await searchBox(page).fill('o')
    await openFilters(page)
    await page.getByLabel('Disponibilidade').selectOption('true')
    await expect(page.getByText('Moss', { exact: true })).toBeVisible()
    await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
    await expect(page.getByText('Sold Out', { exact: true })).toHaveCount(0)

    await page.getByLabel('Ordenação').selectOption('price-asc')
    await page.getByLabel('Disponibilidade').selectOption('')
    await searchBox(page).fill('')
    await expect(page.getByTestId('catalog-grid').locator('a')).toHaveText([
      /Moss/,
      /Aurora/,
      /Sold Out/,
    ])

    await page.goto('/?pageSize=2')
    await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
    await expect(page.getByText('Sold Out', { exact: true })).toHaveCount(0)
    const pageRequest = page.waitForResponse((response) =>
      nftRequest(response.url(), (params) => params.get('page') === '2'),
    )
    await page
      .getByRole('navigation', { name: 'Paginação' })
      .getByRole('link', { name: '2', exact: true })
      .click()
    await pageRequest
    await expect(page.getByText('Sold Out', { exact: true })).toBeVisible()
    await expect(page.getByText('Aurora', { exact: true })).toHaveCount(0)

    await page.getByRole('link', { name: /Sold Out/ }).click()
    await expect(page).toHaveURL(/\/nfts\/nft-sold/)
    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await page.reload()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByText('Sold Out', { exact: true })).toBeVisible()

    await openFilters(page)
    await page.getByLabel('Disponibilidade').selectOption('true')
    await expect(page).not.toHaveURL(/[?&]page=/)
  })
}

test('Enter no detalhe abre a busca e o voltar restaura o NFT', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await resetCatalog(page)
  await page.goto('/nfts/nft-aurora')
  await searchBox(page).fill('moss')
  await expect(page).toHaveURL(/\/nfts\/nft-aurora/)
  await searchBox(page).press('Enter')
  await expect(page).toHaveURL(/q=moss/)
  await expect(page.getByText('Moss', { exact: true })).toBeVisible()
  await expect(page.getByText('Aurora', { exact: true })).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(/\/nfts\/nft-aurora/)
  await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()
})

test('detalhe direto, NFT ausente, rota desconhecida e quantidade', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await resetCatalog(page)

  await page.goto('/nfts/nft-aurora')
  await expect(page.getByRole('heading', { name: 'Aurora' })).toBeVisible()
  const quantity = page.getByRole('textbox', { name: 'Quantidade' })
  const increase = page.getByRole('button', { name: 'Aumentar quantidade' })
  await expect(quantity).toHaveValue('1')
  await increase.click()
  await increase.click()
  await increase.click()
  await expect(quantity).toHaveValue('4')
  await expect(increase).toBeDisabled()

  const cartPosts: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (request.method() === 'POST' && url.pathname === '/api/cart/items') {
      cartPosts.push(url.pathname)
    }
  })
  await expect(page.getByRole('button', { name: 'Compra' })).toBeDisabled()
  expect(cartPosts).toHaveLength(0)

  await page.goto('/nfts/nft-sold')
  await expect(page.getByText('Edição esgotada')).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Quantidade' })).toHaveValue(
    '0',
  )
  await expect(
    page.getByRole('button', { name: 'Aumentar quantidade' }),
  ).toBeDisabled()

  await page.goto('/nfts/nft-ausente')
  await expect(
    page.getByRole('heading', { name: 'NFT não encontrado.' }),
  ).toBeVisible()

  await page.goto('/nao-existe')
  await expect(
    page.getByRole('heading', { name: 'Página não encontrada' }),
  ).toBeVisible()
  await expect(page.getByText('NFT não encontrado.')).toHaveCount(0)
})

test('skeleton, erro com retry e resposta obsoleta', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible()

  const latency = await page.evaluate(async () => {
    const response = await fetch('/api/demo/failures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ latencyMs: 2000 }),
    })
    return response.status
  })
  expect(latency).toBe(200)
  await page.reload()
  const skeleton = page.getByTestId('catalog-skeleton').first()
  await expect(skeleton).toBeVisible()
  const ratio = await skeleton.evaluate(
    (element) => getComputedStyle(element).aspectRatio,
  )
  expect(ratio.replaceAll(' ', '')).toMatch(/^(1\/1|960\/960)$/)
  const running = await skeleton.evaluate(
    (element) => getComputedStyle(element).animationName,
  )
  expect(running).toContain('skeleton-shimmer')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await skeleton.evaluate(
    (element) => getComputedStyle(element).animationName,
  )
  expect(reduced).toBe('none')

  await page.emulateMedia({ reducedMotion: 'no-preference' })
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
  const recovered = page.waitForResponse((response) =>
    nftRequest(response.url(), () => response.ok()),
  )
  await page.getByRole('button', { name: 'Tentar de novo' }).click()
  await recovered
  await expect(page.getByText('Aurora', { exact: true })).toBeVisible()

  await page.evaluate(async () => {
    await fetch('/api/demo/failures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ latencyMs: 1500 }),
    })
  })
  let auroraSettled = false
  const auroraDone = new Promise<void>((resolve) => {
    const finish = (url: string) => {
      if (url.includes('/api/nfts') && url.includes('aurora')) {
        auroraSettled = true
        resolve()
      }
    }
    page.on('requestfinished', (request) => finish(request.url()))
    page.on('requestfailed', (request) => finish(request.url()))
  })
  const started = page.waitForRequest((request) =>
    request.url().includes('aurora'),
  )
  await searchBox(page).fill('aurora')
  await started
  await page.evaluate(async () => {
    await fetch('/api/demo/failures', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
  })
  const moss = page.waitForResponse(
    (response) => response.ok() && response.url().includes('moss'),
  )
  await searchBox(page).fill('moss')
  await moss
  await auroraDone
  expect(auroraSettled).toBe(true)
  await expect(page.getByText('Moss', { exact: true })).toBeVisible()
  await expect(page.getByText('Aurora', { exact: true })).toHaveCount(0)
})

test('imagem do catálogo usa srcset AVIF e WebP', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const image = page.getByRole('img', { name: 'Aurora' })
  await expect(image).toHaveAttribute('width', '960')
  await expect(image).toHaveAttribute('height', '960')
  const markup = await image.evaluate(
    (element) => element.parentElement?.innerHTML ?? '',
  )
  expect(markup).toContain('/images/nfts/emerald-')
  expect(markup).toContain('image/avif')
  expect(markup).toContain('.webp')
  const asset = await page.request.get('/images/nfts/emerald-960.avif')
  expect(asset.status()).toBe(200)
})

test('grade em 768px tem duas colunas', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')
  await expect(searchBox(page)).toBeVisible()
  await expect(page.getByText('Moss', { exact: true })).toBeVisible()
  const columns = await page.getByTestId('catalog-grid').evaluate((element) => {
    return getComputedStyle(element).gridTemplateColumns
  })
  expect(columns.split(' ').filter((part) => part.length > 0)).toHaveLength(2)
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  )
  expect(scrollWidth).toBeLessThanOrEqual(768)
})
