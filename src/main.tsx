import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import './index.css'
import App from './App.tsx'

declare global {
  interface Window {
    __resetMock?: () => void
  }
}

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return
  }

  const { resetMockStorage } = await import('./mocks/persist')
  window.__resetMock = resetMockStorage

  if (import.meta.env.VITE_ENABLE_MSW === 'false') {
    return
  }

  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass',
  })
}

await enableMocking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
