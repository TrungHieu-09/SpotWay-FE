import { Button, Radio, Segmented, Switch } from 'antd'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GuestShell } from '../../components/navigation/GuestShell'
import { useGuestPrefsStore, type GuestPriority, type GuestTextSize, type GuestTheme } from '../../store/useGuestPrefsStore'
import { setGuestLanguage, type GuestLanguage } from '../../utils/i18n'

export function GuestAccessibilityPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const { t, i18n } = useTranslation()
  const prefs = useGuestPrefsStore()
  if (!buildingId) return <Navigate to="/" replace />

  return (
    <GuestShell buildingId={buildingId} active="access">
      <h1 className="guest-shell__title">{t('access.title')}</h1>

      <div className="guest-shell__card">
        <div className="guest-shell__row">
          <span>{t('welcome.language')}</span>
          <Segmented
            value={i18n.language as GuestLanguage}
            onChange={(value) => void setGuestLanguage(value as GuestLanguage)}
            options={[{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }]}
          />
        </div>
      </div>

      <div className="guest-shell__card">
        <div className="guest-shell__row" style={{ marginBottom: 12 }}>
          <span>{t('access.textSize')}</span>
          <Segmented
            value={prefs.textSize}
            onChange={(value) => prefs.setTextSize(value as GuestTextSize)}
            options={[
              { value: 'small', label: t('access.size.small') },
              { value: 'medium', label: t('access.size.medium') },
              { value: 'large', label: t('access.size.large') },
            ]}
          />
        </div>
        <div className="guest-shell__row" style={{ marginBottom: 12 }}>
          <span>{t('access.highContrast')}</span>
          <Switch checked={prefs.highContrast} onChange={prefs.setHighContrast} />
        </div>
        <div className="guest-shell__row">
          <span>{t('access.theme')}</span>
          <Segmented
            value={prefs.theme}
            onChange={(value) => prefs.setTheme(value as GuestTheme)}
            options={[
              { value: 'system', label: t('access.theme.system') },
              { value: 'light', label: t('access.theme.light') },
              { value: 'dark', label: t('access.theme.dark') },
            ]}
          />
        </div>
      </div>

      <div className="guest-shell__card">
        <div style={{ marginBottom: 8 }}>{t('access.priority')}</div>
        <Radio.Group value={prefs.priority} onChange={(event) => prefs.setPriority(event.target.value as GuestPriority)} style={{ display: 'grid', gap: 8 }}>
          <Radio value="AUTO">{t('access.priority.auto')}</Radio>
          <Radio value="ELEVATOR">{t('access.priority.elevator')}</Radio>
          <Radio value="AVOID_STEPS">{t('access.priority.avoidSteps')}</Radio>
        </Radio.Group>
      </div>

      <div className="guest-shell__card">
        <div className="guest-shell__row">
          <div>
            <div>{t('access.demo')}</div>
            <span className="guest-shell__muted">{t('access.demoDesc')}</span>
          </div>
          <Switch checked={prefs.demoMode} onChange={prefs.setDemoMode} />
        </div>
        <Link to={`/guest/${buildingId}/test`}>
          <Button type="link" style={{ paddingLeft: 0 }}>{t('access.testPage')}</Button>
        </Link>
      </div>
    </GuestShell>
  )
}
