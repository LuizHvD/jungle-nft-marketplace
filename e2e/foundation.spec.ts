import { expect, test, type Locator, type Page } from '@playwright/test'

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const

async function expectSingleMain(page: Page) {
  await expect(page.locator('main')).toHaveCount(1)
}

async function expectNoHorizontalOverflow(page: Page) {
  const viewport = page.viewportSize()
  if (viewport) {
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    )
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width)
    return
  }

  throw new Error('Viewport ausente.')
}

async function expectTabReachesNavigation(page: Page) {
  const nav = page.getByRole('navigation')
  await expect(nav).toBeVisible()

  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press('Tab')
    const focusedInNav = await nav.evaluate((element) =>
      element.contains(document.activeElement),
    )
    if (focusedInNav) {
      const outlineStyle = await page.locator(':focus').evaluate((element) => {
        return getComputedStyle(element).outlineStyle
      })
      expect(outlineStyle).not.toBe('none')
      return
    }
  }

  throw new Error('Tab não alcançou a navegação.')
}

for (const viewport of viewports) {
  test(`layout em ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize({ ...viewport })

    await page.goto('/')
    await expectSingleMain(page)
    await expect(page.getByRole('searchbox', { name: 'Busca' })).toBeVisible()
    await expect(page.getByText('Aurora', { exact: true })).toBeVisible()
    await expect(page.getByText('Moss', { exact: true })).toBeVisible()
    await expect(page.getByText('Sold Out', { exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.goto('/fundacao')
    await expectSingleMain(page)
    await expect(page.getByTestId('foundation-skeleton')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectTabReachesNavigation(page)
  })
}

async function contrastRatio(locator: Locator) {
  return locator.evaluate((element) => {
    const parse = (input: string) => {
      const match = input.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
      )
      if (match) {
        return {
          r: Number(match[1]),
          g: Number(match[2]),
          b: Number(match[3]),
          a: match[4] === undefined ? 1 : Number(match[4]),
        }
      }
      return null
    }

    const channel = (value: number) => {
      const srgb = value / 255
      if (srgb <= 0.04045) {
        return srgb / 12.92
      }
      return ((srgb + 0.055) / 1.055) ** 2.4
    }

    const luminance = (color: { r: number; g: number; b: number }) =>
      0.2126 * channel(color.r) +
      0.7152 * channel(color.g) +
      0.0722 * channel(color.b)

    const foreground = parse(getComputedStyle(element).color)
    let node: Element | null = element
    let background: { r: number; g: number; b: number; a: number } | null = null
    while (node) {
      const color = parse(getComputedStyle(node).backgroundColor)
      if (color && color.a > 0) {
        background = color
        break
      }
      node = node.parentElement
    }

    if (foreground && background) {
      const lighter = Math.max(luminance(foreground), luminance(background))
      const darker = Math.min(luminance(foreground), luminance(background))
      return (lighter + 0.05) / (darker + 0.05)
    }

    return 0
  })
}

test('texto e controles permanecem legíveis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const price = page.getByTestId('nft-card-price-nft-aurora')
  await expect(price).toBeVisible()
  expect(await contrastRatio(price)).toBeGreaterThanOrEqual(4.5)

  const filter = page.getByRole('button', { name: 'Filtros' })
  await expect(filter.locator('svg')).toBeVisible()
  expect(await contrastRatio(filter)).toBeGreaterThanOrEqual(4.5)

  for (const name of ['Home', 'Shop', 'User']) {
    await expect(
      page.getByRole('button', { name }).locator('svg'),
    ).toBeVisible()
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/fundacao')
  expect(
    await contrastRatio(page.getByRole('heading', { name: 'Fundação' })),
  ).toBeGreaterThanOrEqual(4.5)

  const footer = page.getByTestId('site-footer')
  await expect(footer).toBeVisible()
  await expect(footer.getByText('KURIO')).toBeVisible()
  await expect(footer.getByText('Newsletter')).toBeVisible()
  await expect(footer.getByRole('img', { name: 'Medalhão 1' })).toBeVisible()
  await expect(footer.getByRole('button', { name: 'Link 1' })).toBeVisible()
  await expect(footer.getByRole('button', { name: 'Social' })).toBeVisible()
  await expect(footer.getByRole('button', { name: 'Carteira' })).toBeVisible()
})

test('tab bar fica no fim da página curta e segue o conteúdo longo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/fundacao')

  const nav = page.getByRole('navigation', { name: 'Tab Bar' })
  const shortBox = await nav.boundingBox()
  expect(shortBox).toBeTruthy()
  if (shortBox) {
    expect(shortBox.y + shortBox.height).toBeGreaterThanOrEqual(844 - 2)
    expect(shortBox.y + shortBox.height).toBeLessThanOrEqual(844 + 1)
  }

  await page.locator('main').evaluate((element) => {
    element.style.minHeight = '2400px'
  })

  const longBox = await nav.boundingBox()
  const mainBox = await page.locator('main').boundingBox()
  expect(longBox).toBeTruthy()
  expect(mainBox).toBeTruthy()
  if (longBox && mainBox) {
    expect(longBox.y).toBeGreaterThanOrEqual(mainBox.y + mainBox.height - 1)
    expect(longBox.y).toBeGreaterThan(844)
  }

  await expect(nav).toHaveCSS('position', 'relative')
})

test('skeleton respeita prefers-reduced-motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/fundacao')

  const skeleton = page.getByTestId('foundation-skeleton')
  await expect(skeleton).toBeVisible()
  const running = await skeleton.evaluate(
    (element) => getComputedStyle(element).animationName,
  )
  expect(running).toContain('skeleton-shimmer')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await skeleton.evaluate(
    (element) => getComputedStyle(element).animationName,
  )
  expect(reduced).toBe('none')
})
