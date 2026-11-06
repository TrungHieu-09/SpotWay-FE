import { useEffect, useMemo, useState } from 'react'
import { Alert, Skeleton } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getAdminOverview, getAdminUsers } from '../../api/admin'
import type { AdminOverview, AdminUser } from '../../types/admin'
import type { Role } from '../../types/auth'
import './AdminPages.css'

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Quản trị viên',
  building_owner: 'Chủ tòa nhà',
  building_manager: 'Quản lý tòa nhà',
  store_owner: 'Chủ gian hàng',
}

function getInitials(nameOrEmail: string): string {
  const cleaned = nameOrEmail.split('@')[0].trim()
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return cleaned.slice(0, 2).toUpperCase() || 'U'
}

export function AdminOverviewPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getAdminOverview(), getAdminUsers()])
      .then(([overviewData, usersData]) => {
        setOverview(overviewData)
        setRecentUsers(usersData.slice(0, 5))
      })
      .catch((reason: Error) => setError(reason.message))
  }, [])

  const roleSegments = useMemo(() => {
    if (!overview) return []
    const { users } = overview
    const total = Math.max(users.total, 1)
    const raw = [
      { key: 'building_manager', label: 'Quản lý tòa nhà', count: users.buildingManager, color: '#8B5CF6' },
      { key: 'admin', label: 'Quản trị viên', count: users.admin, color: '#EC4899' },
      { key: 'building_owner', label: 'Chủ tòa nhà', count: users.buildingOwner, color: '#10B981' },
      { key: 'store_owner', label: 'Chủ gian hàng', count: users.storeOwner, color: '#F59E0B' },
    ]

    const circumference = 2 * Math.PI * 38 // ~238.76
    let accumulatedLength = 0

    return raw.map((item) => {
      const ratio = users.total > 0 ? item.count / total : 0
      const dashLength = ratio * circumference
      const dashOffset = -accumulatedLength
      accumulatedLength += dashLength
      return {
        ...item,
        percentage: users.total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0',
        dashArray: `${Math.max(dashLength - (item.count > 0 ? 2 : 0), 0)} ${circumference}`,
        dashOffset,
      }
    })
  }, [overview])

  if (error) {
    return (
      <main className="adm-page">
        <Alert type="error" showIcon message={error} />
      </main>
    )
  }

  if (!overview) {
    return (
      <main className="adm-page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </main>
    )
  }

  const { users } = overview

  return (
    <main className="adm-page">
      {/* ── Header Row ── */}
      <div className="adm-hero">
        <div>
          <div className="adm-hero__eyebrow">
            <span className="adm-hero__eyebrow-dot" />
            QUẢN TRỊ HỆ THỐNG
          </div>
          <div className="adm-hero__title-row">
            <h1 className="adm-hero__title">Tổng quan</h1>
          </div>
          <p className="adm-hero__subtitle">
            Theo dõi số lượng tài khoản và quy mô vận hành của toàn bộ nền tảng.
          </p>
        </div>

        <div className="adm-hero__actions">
          <button
            type="button"
            className="adm-btn"
            onClick={() => navigate('/admin/accounts')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              group
            </span>
            <span>Quản lý tài khoản</span>
          </button>
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={() => navigate('/admin/accounts?create=1')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              person_add
            </span>
            <span>+ Tạo tài khoản</span>
          </button>
        </div>
      </div>

      {/* ── Row of 5 Stat Cards ── */}
      <div className="adm-stat-grid">
        {/* Card 1: Tài khoản */}
        <div
          className="adm-glass-card adm-stat-card adm-stat-card--clickable"
          onClick={() => navigate('/admin/accounts')}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Tài khoản</p>
              <h3 className="adm-stat-card__value">{users.total}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--violet">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#a78bfa' }}>
              Toàn hệ thống
            </span>
            <svg className="adm-stat-card__spark" width="60" height="22" fill="none" stroke="#a78bfa" viewBox="0 0 60 20">
              <path d="M2,16 Q15,18 25,10 T45,12 T58,4" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Chủ tòa nhà */}
        <div
          className="adm-glass-card adm-stat-card adm-stat-card--clickable"
          onClick={() => navigate('/admin/accounts?role=building_owner')}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Chủ tòa nhà</p>
              <h3 className="adm-stat-card__value">{users.buildingOwner}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--emerald">
              <span className="material-symbols-outlined">domain_verification</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#34d399' }}>
              Chủ sở hữu
            </span>
            <svg className="adm-stat-card__spark" width="60" height="22" fill="none" stroke="#34d399" viewBox="0 0 60 20">
              <path d="M2,12 Q20,12 35,11 T58,8" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Quản lý tòa nhà */}
        <div
          className="adm-glass-card adm-stat-card adm-stat-card--clickable"
          onClick={() => navigate('/admin/accounts?role=building_manager')}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Quản lý tòa nhà</p>
              <h3 className="adm-stat-card__value">{users.buildingManager}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--purple">
              <span className="material-symbols-outlined">badge</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#c084fc' }}>
              Vận hành khu vực
            </span>
            <svg className="adm-stat-card__spark" width="60" height="22" fill="none" stroke="#c084fc" viewBox="0 0 60 20">
              <path d="M2,15 Q18,16 30,9 T48,11 T58,5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Chủ gian hàng */}
        <div
          className="adm-glass-card adm-stat-card adm-stat-card--clickable"
          onClick={() => navigate('/admin/accounts?role=store_owner')}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Chủ gian hàng</p>
              <h3 className="adm-stat-card__value">{users.storeOwner}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--amber">
              <span className="material-symbols-outlined">storefront</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#fbbf24' }}>
              Kiosk &amp; Điểm thuê
            </span>
            <svg className="adm-stat-card__spark" width="60" height="22" fill="none" stroke="#fbbf24" viewBox="0 0 60 20">
              <path d="M2,17 Q25,18 40,8 T58,3" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 5: Tòa nhà */}
        <div className="adm-glass-card adm-stat-card">
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Tòa nhà</p>
              <h3 className="adm-stat-card__value">{overview.buildings}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--cyan">
              <span className="material-symbols-outlined">corporate_fare</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#22d3ee' }}>
              Cơ sở đang hoạt động
            </span>
            <svg className="adm-stat-card__spark" width="60" height="22" fill="none" stroke="#22d3ee" viewBox="0 0 60 20">
              <path d="M2,18 Q16,14 30,12 T48,6 T58,2" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Role Distribution Donut ── */}
      <div className="adm-overview-mid">
        {/* Left: Tài khoản theo vai trò */}
        <div className="adm-glass-card adm-panel">
          <div>
            <div className="adm-panel__head">
              <div>
                <h2 className="adm-panel__title">
                  <span className="material-symbols-outlined" style={{ color: '#e879f9' }}>
                    pie_chart
                  </span>
                  Tài khoản theo vai trò
                </h2>
                <p className="adm-panel__subtitle">
                  Phân bổ tỷ trọng quyền hạn trên toàn nền tảng
                </p>
              </div>
            </div>

            <div className="adm-donut-wrap">
              <svg className="adm-donut-svg" width="186" height="186" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="12"
                />
                {roleSegments.map(
                  (seg) =>
                    seg.count > 0 && (
                      <circle
                        key={seg.key}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={seg.dashArray}
                        strokeDashoffset={seg.dashOffset}
                        strokeLinecap="round"
                      />
                    ),
                )}
              </svg>
              <div className="adm-donut-center">
                <span className="adm-donut-center__val">{users.total}</span>
                <span className="adm-donut-center__lbl">Tổng tài khoản</span>
              </div>
            </div>
          </div>

          <div className="adm-legend-list">
            {roleSegments.map((seg) => (
              <div key={seg.key} className="adm-legend-row">
                <div className="adm-legend-row__left">
                  <span
                    className="adm-legend-dot"
                    style={{
                      background: seg.color,
                      boxShadow: `0 0 8px ${seg.color}`,
                    }}
                  />
                  <span>{seg.label}</span>
                </div>
                <div className="adm-legend-row__right">
                  <span className="adm-legend-row__count">{seg.count}</span>
                  <span className="adm-legend-row__pct">({seg.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Tài khoản mới tạo (5 gần nhất) ── */}
      <div className="adm-glass-card adm-table-card">
        <div className="adm-table-card__header">
          <div className="adm-table-card__header-left">
            <div className="adm-stat-card__icon adm-stat-card__icon--pink">
              <span className="material-symbols-outlined">person_add</span>
            </div>
            <div>
              <h2 className="adm-panel__title">
                Tài khoản mới tạo
                <span className="adm-pill-badge">{recentUsers.length} gần nhất</span>
              </h2>
              <p className="adm-panel__subtitle">
                Danh sách tài khoản được khởi tạo gần đây trên hệ thống
              </p>
            </div>
          </div>

          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() => navigate('/admin/accounts')}
          >
            <span>Xem tất cả</span>
            <span>→</span>
          </button>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Thuộc chủ tòa nhà</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="adm-user-cell">
                      <div className={`adm-user-avatar adm-user-avatar--${user.role}`}>
                        {getInitials(user.name || user.email)}
                      </div>
                      <span className="adm-user-cell__name">
                        {user.name || user.email.split('@')[0]}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="adm-user-cell__email">{user.email}</span>
                  </td>
                  <td>
                    <span className={`adm-role-pill adm-role-pill--${user.role}`}>
                      <span className="adm-role-pill__dot" />
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td>
                    {user.role === 'admin'
                      ? 'Toàn hệ thống'
                      : user.role === 'building_owner'
                        ? 'Chính họ'
                        : (user.tenantName ?? '—')}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#958ea0' }}>
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="adm-btn adm-btn--sm"
                      onClick={() => navigate(`/admin/accounts?q=${encodeURIComponent(user.email)}`)}
                    >
                      Quản lý
                    </button>
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#958ea0' }}>
                    Chưa có tài khoản nào trong hệ thống.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
