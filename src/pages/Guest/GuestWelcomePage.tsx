import { Button, Segmented, Space, Typography } from 'antd'
import { CompassOutlined, QrcodeOutlined } from '@ant-design/icons'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GuestShell } from '../../components/navigation/GuestShell'
import { setGuestLanguage, type GuestLanguage } from '../../utils/i18n'

export function GuestWelcomePage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  if (!buildingId) return <Navigate to="/" replace />

  return (
    <GuestShell buildingId={buildingId}>
      <Space orientation="vertical" size={20} style={{ width: '100%', paddingTop: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <CompassOutlined style={{ fontSize: 56, color: 'var(--g-accent)' }} />
          <Typography.Text className="guest-shell__muted" style={{ display: 'block', marginTop: 8 }}>{t('welcome.tagline')}</Typography.Text>
          <h1 className="guest-shell__title" style={{ marginTop: 8 }}>{t('welcome.headline')}</h1>
          <p className="guest-shell__muted">{t('welcome.desc')}</p>
        </div>
        <Button type="primary" size="large" block icon={<QrcodeOutlined />} onClick={() => navigate(`/guest/${buildingId}/map?scan=1`)}>
          {t('welcome.scan')}
        </Button>
        <Button size="large" block onClick={() => navigate(`/guest/${buildingId}/map`)}>
          {t('welcome.openMap')}
        </Button>
        <div className="guest-shell__row">
          <span>{t('welcome.language')}</span>
          <Segmented
            value={i18n.language as GuestLanguage}
            onChange={(value) => void setGuestLanguage(value as GuestLanguage)}
            options={[
              { value: 'vi', label: 'Tiếng Việt' },
              { value: 'en', label: 'English' },
            ]}
          />
        </div>
      </Space>
    </GuestShell>
  )
}
