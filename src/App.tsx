import { App as AntApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './auth/store'
import { router } from './routes'
import './App.css'
import { appTheme } from './theme/theme'
import './styles/global.css'

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <ConfigProvider locale={viVN} theme={appTheme}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}
