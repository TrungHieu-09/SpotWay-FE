import type { ReactNode } from 'react'
import { AimOutlined, ApartmentOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGuestPrefsStore } from '../../store/useGuestPrefsStore'
import '../../utils/i18n'
import './GuestShell.css'

export type GuestTab = 'map' | 'search' | 'building' | 'access'

/** Khung dùng chung cho các màn Guest: áp tuỳ chọn trợ năng (cỡ chữ, tương phản, giao diện) và thanh tab đáy. */
export function GuestShell({ buildingId, active, children }: { buildingId: string; active?: GuestTab; children: ReactNode }) {
  const { t } = useTranslation()
  const textSize = useGuestPrefsStore((state) => state.textSize)
  const highContrast = useGuestPrefsStore((state) => state.highContrast)
  const theme = useGuestPrefsStore((state) => state.theme)
  const base = `/guest/${buildingId}`
  const tabs: Array<{ key: GuestTab; to: string; label: string; icon: ReactNode }> = [
    { key: 'map', to: `${base}/map`, label: t('tab.map'), icon: <AimOutlined /> },
    { key: 'search', to: `${base}/search`, label: t('tab.search'), icon: <SearchOutlined /> },
    { key: 'building', to: `${base}/building`, label: t('tab.building'), icon: <ApartmentOutlined /> },
    { key: 'access', to: `${base}/accessibility`, label: t('tab.access'), icon: <SettingOutlined /> },
  ]

  return (
    <div className="guest-shell" data-text-size={textSize} data-contrast={highContrast ? 'high' : 'normal'} data-theme={theme}>
      <div className="guest-shell__body">{children}</div>
      <nav className="guest-shell__tabs" aria-label="Guest">
        {tabs.map((tab) => (
          <Link key={tab.key} to={tab.to} className="guest-shell__tab" aria-current={active === tab.key ? 'page' : undefined}>
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
