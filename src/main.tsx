import { startMocks } from './mocks/browser.ts'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento #root não encontrado.')
}

await startMocks()

const { renderApp } = await import('./app/render.tsx')
renderApp(rootElement)
