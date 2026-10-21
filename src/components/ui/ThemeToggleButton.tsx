import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { useTheme } from '../../theme/useTheme'

export function ThemeToggleButton() {
  const { mode, toggleMode } = useTheme()
  const nextLabel = mode === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'
  return <Tooltip title={nextLabel}><Button type="text" icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />} aria-label={nextLabel} onClick={toggleMode} /></Tooltip>
}
