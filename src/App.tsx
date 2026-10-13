import { App as AntApp, ConfigProvider, theme } from 'antd'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#8B5CF6',
          colorLink: '#22D3EE',
          colorSuccess: '#22D3EE',
          colorWarning: '#E879F9',
          colorError: '#FF6464',
          colorBgBase: '#0B0B1A',
          colorBgContainer: 'rgba(18, 18, 42, 0.65)',
          colorBgElevated: 'rgba(28, 27, 59, 0.75)',
          colorBorder: 'rgba(255, 255, 255, 0.10)',
          colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
          colorText: '#E3E0F6',
          colorTextSecondary: '#958EA0',
          colorTextTertiary: '#64748B',
          fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
          borderRadius: 8,
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        },
      }}
    >
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}
