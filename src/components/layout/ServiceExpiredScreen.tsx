import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import { useServiceLockStore } from '../../store/useServiceLockStore'
import './ServiceExpiredScreen.css'

/** Replaces every page that needs the service once the workspace's contract has ended. */
export function ServiceExpiredScreen() {
  const message = useServiceLockStore((state) => state.message)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const isOwner = user?.role === 'building_owner'

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="sx-root">
      <section className="sx-card">
        <span className="material-symbols-outlined sx-icon">event_busy</span>
        <h1 className="sx-title">Hợp đồng dịch vụ đã hết hạn</h1>
        <p className="sx-text">{message}</p>
        <p className="sx-text sx-text--muted">
          {isOwner
            ? 'Bạn vẫn xem được hợp đồng và gửi yêu cầu gia hạn. Sau khi Quản trị viên gia hạn, hãy tải lại trang để dùng tiếp.'
            : 'Hãy liên hệ chủ tòa nhà để gia hạn dịch vụ. Sau khi gia hạn, bạn tải lại trang để dùng tiếp.'}
        </p>
        <div className="sx-actions">
          {isOwner && (
            <button type="button" className="sx-btn sx-btn--primary" onClick={() => navigate('/owner/contracts')}>
              Xem hợp đồng &amp; xin gia hạn
            </button>
          )}
          <button type="button" className="sx-btn" onClick={() => window.location.reload()}>
            Tải lại
          </button>
          <button type="button" className="sx-btn" onClick={() => void handleLogout()}>
            Đăng xuất
          </button>
        </div>
      </section>
    </main>
  )
}
