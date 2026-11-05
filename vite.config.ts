import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Use real NestJS backend by default (with /api proxy to http://localhost:3000/api/v1)
  // MSW is ONLY enabled if explicitly running in 'mock' mode (vite --mode mock)
  const isMockMode = mode === 'mock'

  return {
    plugins: [react()],
    server: {
      // Proxy /api → NestJS backend by default
      proxy: !isMockMode
        ? {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
              // FE calls /api/auth/register → BE receives /api/v1/auth/register
              rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
            },
          }
        : undefined,
    },
    define: {
      'import.meta.env.VITE_ENABLE_MSW': JSON.stringify(isMockMode ? 'true' : 'false'),
    },
  }
})
