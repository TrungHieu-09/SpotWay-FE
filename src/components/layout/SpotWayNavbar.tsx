import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore, roleLabel } from '../../auth/store'
import type { AuthUser } from '../../types/auth'
import './SpotWayNavbar.css'

interface SpotWayNavbarProps {
  activeTab?: 'home' | 'features' | 'solutions' | 'analytics' | 'explore' | 'account'
  lang?: 'VI' | 'EN'
  onLanguageChange?: (lang: 'VI' | 'EN') => void
  showNavLinks?: boolean
}

export function getPortalRoute(user: AuthUser | null | undefined): string {
  if (!user) return '/login'
  if (user.role === 'admin') return '/admin'
  if (user.tenantId || user.tenant) {
    if (user.role === 'building_owner') return '/owner/dashboard'
    if (user.role === 'building_manager') return '/manager'
    if (user.role === 'store_owner') return '/store/profile'
  }
  return '/account'
}

export function SpotWayNavbar({
  activeTab,
  lang = 'VI',
  onLanguageChange,
  showNavLinks = true,
}: SpotWayNavbarProps) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const userDisplayName = user?.name || (user?.email ? user.email.split('@')[0] : 'User')
  const userInitial = userDisplayName.charAt(0).toUpperCase()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const handleAnchorClick = (id: string) => {
    if (window.location.pathname === '/') {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const portalRoute = getPortalRoute(user)
  const portalLabel = user?.tenantId ? 'Vào hệ thống' : 'Workspace Hub'

  return (
    <header className="spw-navbar-header">
      <div className="spw-navbar-inner">
        {/* ── Brand Logo — Unified near_me icon & Spatial OS badge ── */}
        <Link to="/" className="spw-brand group" title="Về trang chủ SpotWay">
          <div className="spw-brand-icon">
            <div className="spw-brand-icon-inner">
              <span className="material-symbols-outlined">near_me</span>
            </div>
            <span className="spw-brand-ping ping-anim" />
            <span className="spw-brand-ping" />
          </div>
          <div className="flex items-baseline">
            <span className="spw-brand-text">SpotWay</span>
            <span className="spw-brand-sub">Spatial OS</span>
          </div>
        </Link>

        {/* ── Center Nav Links ── */}
        {showNavLinks && (
          <ul className="spw-nav-links">
            <li>
              <Link
                to="/#features"
                className={activeTab === 'features' ? 'active' : ''}
                onClick={() => handleAnchorClick('features')}
              >
                <span>Tính năng</span>
                {activeTab === 'features' && <span className="spw-dot-active" />}
              </Link>
            </li>
            <li>
              <Link
                to="/#solutions"
                className={activeTab === 'solutions' ? 'active' : ''}
                onClick={() => handleAnchorClick('solutions')}
              >
                <span>Giải pháp</span>
                {activeTab === 'solutions' && <span className="spw-dot-active" />}
              </Link>
            </li>
            <li>
              <Link
                to="/#analytics"
                className={activeTab === 'analytics' ? 'active' : ''}
                onClick={() => handleAnchorClick('analytics')}
              >
                <span>Phân tích</span>
                {activeTab === 'analytics' && <span className="spw-dot-active" />}
              </Link>
            </li>
            <li>
              <Link to="/guest" className={activeTab === 'explore' ? 'active' : ''}>
                <span className="material-symbols-outlined" style={{ fontSize: '17px', color: '#22d3ee' }}>
                  explore
                </span>
                <span>Khám phá 3D</span>
                {activeTab === 'explore' && <span className="spw-dot-active" />}
              </Link>
            </li>
          </ul>
        )}

        {/* ── Right Utilities & User Auth ── */}
        <div className="spw-nav-actions">
          {/* Language Switcher Pill */}
          <div className="spw-lang-pill">
            <button
              type="button"
              className={`spw-lang-btn ${lang === 'EN' ? 'spw-lang-btn--active' : ''}`}
              onClick={() => onLanguageChange?.('EN')}
            >
              EN
            </button>
            <button
              type="button"
              className={`spw-lang-btn ${lang === 'VI' ? 'spw-lang-btn--active' : ''}`}
              onClick={() => onLanguageChange?.('VI')}
            >
              VI
            </button>
          </div>

          {user ? (
            <>
              {/* User Dropdown Chip */}
              <div className="spw-user-chip-wrap" ref={dropdownRef}>
                <button
                  type="button"
                  className="spw-user-chip"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  title={`Tài khoản: ${userDisplayName}`}
                >
                  <div className="spw-avatar-circle">{userInitial}</div>
                  <div className="spw-user-meta hidden sm:flex">
                    <span className="spw-user-name">{userDisplayName}</span>
                    <span className="spw-user-role">
                      {user.tenantId ? roleLabel(user.role) : 'Chưa được gán quyền'}
                    </span>
                  </div>
                  <span
                    className="material-symbols-outlined text-[16px] text-[#958ea0]"
                    style={{
                      transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    expand_more
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="spw-dropdown-menu">
                    <div className="spw-dropdown-header">
                      <p className="spw-dropdown-title">{userDisplayName}</p>
                      <p className="spw-dropdown-email">{user.email}</p>
                    </div>

                    <Link
                      to="/account"
                      className="spw-dropdown-item"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined">corporate_fare</span>
                      <span>Không gian làm việc</span>
                    </Link>

                    <Link
                      to="/profile"
                      className="spw-dropdown-item"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <span className="material-symbols-outlined">manage_accounts</span>
                      <span>Hồ sơ &amp; Cài đặt</span>
                    </Link>

                    <div className="spw-dropdown-divider" />

                    <button
                      type="button"
                      className="spw-dropdown-item spw-dropdown-item--danger"
                      onClick={handleLogout}
                    >
                      <span className="material-symbols-outlined">logout</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct Workspace / Account Portal CTA Button */}
              <Link to={portalRoute} className="spw-btn-primary hidden md:inline-flex">
                <span>{portalLabel}</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="spw-btn-primary">
                <span>Đăng nhập</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
export default SpotWayNavbar
