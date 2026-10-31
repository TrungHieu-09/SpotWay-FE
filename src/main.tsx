import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
// Fonts loaded via index.html Google Fonts link tags
import './styles/index.css'
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

  // Unregister any stale service workers before starting fresh
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const reg of registrations) {
      if (reg.active?.scriptURL.includes('mockServiceWorker')) {
        await reg.update()
      }
    }
  }

  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
      options: { scope: '/' },
    },
  })
}

await enableMocking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
