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

async function cleanupServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        await reg.unregister()
      }
    } catch {
      // ignore
    }
  }
}

await cleanupServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
