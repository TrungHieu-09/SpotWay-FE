import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableMsw = env.VITE_ENABLE_MSW !== 'false'

  return {
    plugins: [react()],
    server: {
      // Proxy /api → NestJS backend when MSW is disabled
      proxy: !enableMsw
        ? {
            '/api': {
              target: 'http://localhost:3000',
              changeOrigin: true,
              // FE uses /api/auth/register → BE expects /api/v1/auth/register
              rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
            },
          }
        : undefined,
    },
  }
})
