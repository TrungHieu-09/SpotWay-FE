import { useMemo } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { useThemeStore } from './store/useThemeStore'
import { buildAntdTheme } from './utils/antdTheme'

export default function App() {
  const isDark = useThemeStore((state) => state.isDark)
  const antdTheme = useMemo(() => buildAntdTheme(isDark), [isDark])

  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}
