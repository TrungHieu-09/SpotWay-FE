import { useEffect, useState } from 'react'
import { Alert, Empty, Spin, Statistic } from 'antd'
import { getNavigationAnalytics, type NavigationAnalytics } from '../../api/analytics'
import { GlassCard } from '../../components/ui'

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—'
  return seconds >= 60 ? `${Math.floor(seconds / 60)} phút ${seconds % 60} giây` : `${seconds} giây`
}

/** Hoạt động của khách trong 7 ngày qua, từ ứng dụng di động. */
export function NavigationAnalyticsCard() {
  const [data, setData] = useState<NavigationAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getNavigationAnalytics()
      .then((result) => !cancelled && setData(result))
      .catch((reason: Error & { status?: number }) => {
        if (cancelled) return
        setError(reason.status === 503 ? 'Hệ thống phân tích chưa được cấu hình (thiếu MongoDB).' : reason.message)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const maxDaily = Math.max(1, ...(data?.daily.map((day) => day.count) ?? [1]))

  return (
    <GlassCard title="Hoạt động của khách (7 ngày)">
      {loading ? (
        <Spin />
      ) : error ? (
        <Alert type="warning" showIcon message={error} />
      ) : !data || data.events === 0 ? (
        <Empty description="Chưa có dữ liệu. Mở ứng dụng di động và thử chỉ đường." />
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28 }}>
            <Statistic title="Lượt quét QR" value={data.qrScans} />
            <Statistic title="Chuyến chỉ đường" value={data.routes.started} />
            <Statistic title="Hoàn thành" value={data.routes.completed} suffix={data.routes.started ? `/ ${data.routes.started}` : undefined} />
            <Statistic title="Thời gian trung bình" value={formatDuration(data.routes.avgDurationSeconds)} />
            <Statistic title="Lượt sơ tán" value={data.routes.evacuations} suffix={data.safeReached ? `· ${data.safeReached} đã an toàn` : undefined} />
            <Statistic title="Yêu cầu hỗ trợ" value={data.helpRequests ?? 0} />
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Sự kiện theo ngày</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
              {data.daily.map((day) => (
                <div key={day.date} style={{ flex: 1, textAlign: 'center' }} title={`${day.date}: ${day.count}`}>
                  <div style={{ height: Math.max(4, (day.count / maxDaily) * 70), background: 'var(--ant-color-primary, #1677ff)', borderRadius: 4 }} />
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{day.date.slice(5)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Đích đến phổ biến</div>
              {data.topDestinations.length === 0 ? <span style={{ opacity: 0.6 }}>Chưa có</span> : data.topDestinations.map((item) => (
                <div key={item.storeId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.name ?? 'Địa điểm đã xóa'}</span>
                  <b>{item.count}</b>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Từ khóa tìm nhiều</div>
              {data.topSearches.length === 0 ? <span style={{ opacity: 0.6 }}>Chưa có</span> : data.topSearches.map((item) => (
                <div key={item.query} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.query}</span>
                  <b>{item.count}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
