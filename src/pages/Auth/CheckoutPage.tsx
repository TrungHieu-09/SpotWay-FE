import { useEffect, useState } from 'react'
import { App as AntApp, Spin } from 'antd'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { cancelOrder, getOrder, payOrder } from '../../api/billing'
import { useAuthStore } from '../../auth/store'
import type { PlanOrder } from '../../types/billing'
import '../../components/layout/SpotWayNavbar.css'
import './CheckoutPage.css'

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`

export function CheckoutPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const isInitializing = useAuthStore((state) => state.isInitializing)

  const [order, setOrder] = useState<PlanOrder | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const backPath = '/owner/subscription'

  useEffect(() => {
    if (!user) return
    getOrder(orderId)
      .then(setOrder)
      .catch((err: Error) => setLoadError(err.message))
  }, [orderId, user])

  if (isInitializing) {
    return (
      <div className="wob-root">
        <main className="wob-main"><Spin size="large" /></main>
      </div>
    )
  }
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(`/checkout/${orderId}`)}`} replace />
  }

  const handlePay = async () => {
    if (!order) return
    setBusy(true)
    try {
      await payOrder(order.id)
      message.success('Đã thanh toán và gia hạn gói dịch vụ thành công!')
      navigate(backPath, { replace: true })
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Thanh toán thất bại')
    } finally {
      setBusy(false)
    }
  }

  const handleCancel = async () => {
    if (!order) return
    setBusy(true)
    try {
      await cancelOrder(order.id)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể hủy đơn hàng')
    } finally {
      setBusy(false)
      navigate(backPath, { replace: true })
    }
  }

  return (
    <div className="wob-root">
      <div className="wob-grid" />
      <main className="wob-main">
        <div className="wob-card">
          <div className="wob-header">
            <h1 className="wob-title">Thanh toán gói dịch vụ</h1>
            <p className="wob-subtitle">Gói dịch vụ sẽ được gia hạn ngay sau khi thanh toán thành công.</p>
          </div>

          {loadError && (
            <div className="wob-security-pill">
              <span className="material-symbols-outlined">error</span>
              <p className="wob-security-text">{loadError}</p>
            </div>
          )}

          {!order && !loadError && <Spin size="large" />}

          {order && (
            <div className="wob-form">
              <dl>
                <div className="wob-field">
                  <dt className="wob-label">Gói dịch vụ</dt>
                  <dd>{order.planName} — {order.months} tháng</dd>
                </div>
                <div className="wob-field">
                  <dt className="wob-label">Tổng thanh toán</dt>
                  <dd><strong>{formatVnd(order.amountVnd)}</strong></dd>
                </div>
              </dl>

              {order.status === 'PENDING' ? (
                <>
                  <div className="wob-security-pill">
                    <span className="material-symbols-outlined">science</span>
                    <p className="wob-security-text">
                      Cổng thanh toán đang ở chế độ thử nghiệm: bấm thanh toán sẽ xác nhận đơn hàng mà không trừ tiền thật.
                    </p>
                  </div>
                  <div className="wob-actions-row">
                    <button type="button" className="wob-btn-skip" onClick={handleCancel} disabled={busy}>
                      <span>Hủy đơn</span>
                    </button>
                    <button type="button" className="wob-btn-continue" onClick={handlePay} disabled={busy}>
                      <span>{busy ? 'Đang xử lý...' : `Thanh toán ${formatVnd(order.amountVnd)}`}</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="wob-security-pill">
                  <span className="material-symbols-outlined">info</span>
                  <p className="wob-security-text">
                    {order.status === 'PAID' ? 'Đơn hàng này đã được thanh toán.' : 'Đơn hàng này đã bị hủy.'}{' '}
                    <Link to={order.status === 'PAID' ? '/owner/dashboard' : backPath}>
                      {order.status === 'PAID' ? 'Về bảng điều khiển' : 'Tạo đơn mới'}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default CheckoutPage
