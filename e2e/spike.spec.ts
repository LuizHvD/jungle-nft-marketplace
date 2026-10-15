import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { initialSpikePrice, nextSpikePrice } from '../src/contracts/spike-nft'

test('preço muda só depois do evento nft.updated', async ({ page }) => {
  let catalogReads = 0

  page.on('response', (response) => {
    const url = new URL(response.url())
    if (
      url.pathname === '/api/spike/nft' &&
      response.request().method() === 'GET'
    ) {
      catalogReads += 1
    }
  })

  await page.goto('/')
  await expect(page.getByTestId('socket-status')).toHaveText('connected')
  await expect(page.getByTestId('nft-price')).toHaveText(initialSpikePrice)
  const readsBeforeBump = catalogReads

  const bumpResponse = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      url.pathname === '/api/spike/nft/price' &&
      response.request().method() === 'POST'
    )
  })
  await page.getByRole('button', { name: 'Alterar preço' }).click()
  const response = await bumpResponse

  expect(response.status()).toBe(204)
  expect(await response.text()).toBe('')
  expect(catalogReads).toBe(readsBeforeBump)
  await expect(page.getByTestId('nft-price')).toHaveText(nextSpikePrice)
  expect(catalogReads).toBe(readsBeforeBump)
})

test('websocket fora do Socket.IO chega ao servidor original', async ({
  page,
}) => {
  const echo = await startEchoServer()

  try {
    await page.goto('/')
    const connected = echo.whenUpgrade()
    await page.evaluate((url) => {
      new WebSocket(url)
    }, echo.url)
    await connected
  } finally {
    await echo.close()
  }
})

test('HMR do Vite permanece conectado', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'dev', 'o preview não abre o HMR')

  const viteConnected = new Promise<void>((resolve) => {
    page.on('console', (message) => {
      if (message.text().includes('[vite] connected')) {
        resolve()
      }
    })
  })

  await page.goto('/')
  await viteConnected
})

function startEchoServer(): Promise<{
  url: string
  whenUpgrade: () => Promise<void>
  close: () => Promise<void>
}> {
  const server: Server = createServer()
  let notifyUpgrade: () => void = () => {}
  const upgrade = new Promise<void>((resolve) => {
    notifyUpgrade = resolve
  })
  server.on('upgrade', (request, socket) => {
    notifyUpgrade()
    const key = request.headers['sec-websocket-key']
    const accept = createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64')
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    )
    socket.end()
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      resolve({
        url: `ws://127.0.0.1:${port}/echo`,
        whenUpgrade: () => upgrade,
        close: () =>
          new Promise((done) => {
            server.close(() => done())
          }),
      })
    })
  })
}
