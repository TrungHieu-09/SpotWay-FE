import { App as AntApp, ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { RouterProvider } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from './auth/store'
import { router } from './routes'
import './App.css'
import { appTheme } from './theme/theme'
import './styles/global.css'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function readReducedMotionPreference() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(readReducedMotionPreference)

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return reducedMotion
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize)
  const reducedMotion = useReducedMotionPreference()
  const theme = useMemo(() => ({
    ...appTheme,
    token: {
      ...appTheme.token,
      motion: !reducedMotion,
      zIndexPopupBase: 1100,
    },
    components: {
      ...appTheme.components,
      DatePicker: { zIndexPopup: 1100 },
      Dropdown: { zIndexPopup: 1100 },
      Menu: { zIndexPopup: 1100 },
      Popconfirm: { zIndexPopup: 1100 },
      Popover: { zIndexPopup: 1100 },
      Select: { zIndexPopup: 1100 },
      Tooltip: { zIndexPopup: 1100 },
    },
  }), [reducedMotion])

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
