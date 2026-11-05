import type { ReactNode } from 'react'
import { Button, Dropdown } from 'antd'
import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { useThemeStore, type ThemeMode } from '../../store/useThemeStore'

const MODE_ITEMS: { key: ThemeMode; label: string; icon: ReactNode }[] = [
  { key: 'light', label: 'Sáng', icon: <SunOutlined /> },
  { key: 'dark', label: 'Tối', icon: <MoonOutlined /> },
  { key: 'auto', label: 'Theo hệ thống', icon: <DesktopOutlined /> },
]

export function ThemeToggle() {
  const mode = useThemeStore((state) => state.mode)
  const isDark = useThemeStore((state) => state.isDark)
  const setMode = useThemeStore((state) => state.setMode)

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: MODE_ITEMS,
        selectable: true,
        selectedKeys: [mode],
        onClick: ({ key }) => setMode(key as ThemeMode),
      }}
    >
      <Button
        type="text"
        shape="circle"
        aria-label="Đổi giao diện sáng/tối"
        icon={isDark ? <MoonOutlined /> : <SunOutlined />}
      />
    </Dropdown>
  )
}
