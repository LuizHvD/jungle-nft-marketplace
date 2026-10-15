import { expect, test, type Page } from '@playwright/test'

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
    await expectNoHorizontalOverflow(page)

    await page.goto('/fundacao')
    await expectSingleMain(page)
    await expect(page.getByTestId('foundation-skeleton')).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectTabReachesNavigation(page)
  })
}

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
