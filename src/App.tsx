import { App as AntApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './auth/store'
import { router } from './routes'
import './App.css'
import { ThemeProvider, useAppTheme, useReducedMotionPreference } from './theme/ThemeProvider'
import './styles/global.css'

export default function App() {
  return <ThemeProvider><ThemedApp /></ThemeProvider>
}

function ThemedApp() {
  const initializeAuth = useAuthStore((state) => state.initialize)
  const reducedMotion = useReducedMotionPreference()
  const theme = useAppTheme(reducedMotion)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <ConfigProvider locale={viVN} theme={theme}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}
