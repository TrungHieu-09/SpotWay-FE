import { useState, useEffect } from 'react'
import { App as AntApp } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import { SpotWayNavbar } from '../../components/layout/SpotWayNavbar'
import './AccountHomePage.css'

export function AccountHomePage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)

  const [lang, setLang] = useState<'VI' | 'EN'>('VI')

  // Display name (read-only here — editable in /profile)
  const [displayName, setDisplayName] = useState(
    user?.name || (user?.email ? user.email.split('@')[0] : 'User'),
  )

  // Sync display name when user store updates
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || (user.email ? user.email.split('@')[0] : 'User'))
    }
  }, [user])

  return (
    <div className="ah-page-root">
      {/* ── Top Nav ── */}
      <SpotWayNavbar
        activeTab="account"
        lang={lang}
        onLanguageChange={(newLang) => setLang(newLang)}
      />

      {/* ── Main Viewport ── */}
      <main className="ah-main-viewport">
        {/* HUD Ticker */}
        <div className="ah-hud-ticker">
          <div className="ah-hud-ticker__left">
            <span className="ah-hud-pulse-dot" />
            <span>WORKSPACE HUB</span>
            <span className="ah-hud-sep">/</span>
            <span className="ah-hud-node">NODE-00 // STANDALONE USER</span>
          </div>
          <div className="ah-hud-ticker__right">
            <span>LAT: 37.7749° N</span>
            <span>LON: 122.4194° W</span>
            <span className="ah-hud-radar">RADAR ACTIVE</span>
          </div>
        </div>

        {/* ── SINGLE COLUMN (workspace-focused) ── */}
        <div className="ah-workspace-layout">

          {/* ── 1. HERO: Welcome + Workspace Actions ── */}
          <section className="ah-glass-card ah-hero-card">
            <div className="ah-hero-glow ah-hero-glow--top" />
            <div className="ah-hero-glow ah-hero-glow--bottom" />

            <div className="ah-hero-content">
              {/* Left: Text & CTA */}
              <div className="ah-hero-text">
                <div className="ah-pill-operator">
                  <span className="material-symbols-outlined text-[14px]">spatial_tracking</span>
                  <span>UNATTACHED OPERATOR</span>
                </div>

                <h1 className="ah-hero-title">
                  {lang === 'VI' ? `Chào mừng, ${displayName}` : `Welcome, ${displayName}`}
                </h1>

                <p className="ah-hero-desc">
                  {lang === 'VI'
                    ? 'Tài khoản của bạn chưa được gán vào workspace hoặc vai trò nào. Vui lòng liên hệ quản trị viên để được cấp quyền, sau đó đăng nhập lại.'
                    : 'Your account has not been assigned to a workspace or role yet. Please contact your administrator, then sign in again.'}
                </p>

                {/* Quick link to Profile page */}
                <div className="ah-hero-quick-links">
                  <Link to="/profile" className="ah-quick-link">
                    <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                    <span>{lang === 'VI' ? 'Hồ sơ & Cài đặt cá nhân' : 'Profile & Personal Settings'}</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Right: Isometric 3D Floor-Plate HUD */}
              <div className="ah-iso-wrapper">
                <div className="ah-iso-cube">
                  <div className="ah-iso-quadrants">
                    <div className="ah-iso-cell ah-iso-cell--border-rb" />
                    <div className="ah-iso-cell ah-iso-cell--border-b" />
                    <div className="ah-iso-cell ah-iso-cell--border-r" />
                    <div className="ah-iso-cell" />
                  </div>
                  <div className="ah-iso-node-a-ping" />
                  <div className="ah-iso-node-a" />
                  <div className="ah-iso-beacon-line" />
                  <div className="ah-iso-node-b" />
                  <span className="ah-iso-hud-tag">Z: +14.2m</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── 3. EXPLORE AS GUEST ── */}
          <section className="ah-glass-card ah-explore-card">
            <div className="ah-explore-header">
              <div className="ah-explore-icon-desc">
                <div className="ah-explore-icon-box">
                  <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
                </div>
                <div>
                  <h2 className="ah-card-title">
                    {lang === 'VI' ? 'Khám phá ở chế độ Khách' : 'Explore as a guest'}
                  </h2>
                  <p className="ah-card-sub">
                    {lang === 'VI'
                      ? 'Quét mã QR hoặc mở liên kết tòa nhà để điều hướng không gian mà không cần thuộc workspace.'
                      : 'Scan a QR code or open a building link to navigate indoors. No workspace needed.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="ah-btn-open-map"
                onClick={() => navigate('/guest')}
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
                <span>{lang === 'VI' ? 'Mở bản đồ Demo' : 'Open Demo Map'}</span>
              </button>
            </div>

            {/* Saved Places */}
            <div className="ah-saved-places-section">
              <div className="ah-saved-places-title-row">
                <span className="ah-saved-places-label">
                  <span className="material-symbols-outlined text-[16px] text-[#f8acff]">bookmark</span>
                  <span>{lang === 'VI' ? 'Địa điểm đã lưu' : 'Saved places'}</span>
                </span>
                <span className="ah-saved-places-count">
                  {lang === 'VI' ? '2 địa điểm khả dụng' : '2 locations saved'}
                </span>
              </div>

              <div className="ah-saved-places-grid">
                <div className="ah-saved-place-item group">
                  <div className="ah-place-left">
                    <div className="ah-place-icon-box">
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                    </div>
                    <div className="ah-place-meta">
                      <h4 className="ah-place-name">Gate B22 - Concourse 2</h4>
                      <p className="ah-place-sub">Metro Airport • Level 2</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ah-btn-nav-place"
                    onClick={() => navigate('/guest')}
                    title="Dẫn đường đến đây"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>

                <div className="ah-saved-place-item group">
                  <div className="ah-place-left">
                    <div className="ah-place-icon-box ah-place-icon-box--purple">
                      <span className="material-symbols-outlined text-[18px]">location_on</span>
                    </div>
                    <div className="ah-place-meta">
                      <h4 className="ah-place-name">Innovation Lab - Suite 400</h4>
                      <p className="ah-place-sub">Tech Plaza • Level 4</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ah-btn-nav-place"
                    onClick={() => navigate('/guest')}
                    title="Dẫn đường đến đây"
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              <p className="ah-saved-places-footnote">
                <span className="material-symbols-outlined text-[15px]">info</span>
                <span>
                  {lang === 'VI'
                    ? 'Lưu lại các điểm dừng khi đang điều hướng để truy cập phím tắt nhanh tại đây.'
                    : 'Save places while navigating to see them here for quick transit shortcuts.'}
                </span>
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="ah-footer">
        <div className="ah-footer-inner">
          <div className="flex items-center gap-3">
            <span className="ah-footer-brand">SpotWay</span>
            <span className="text-[#958ea0] text-xs">|</span>
            <span className="ah-footer-copy">© 2026 SpotWay Spatial OS Inc. All rights reserved.</span>
          </div>
          <div className="ah-footer-links">
            <Link to="/#features">3D Mapping Engine</Link>
            <Link to="/guest">Indoor Telemetry</Link>
            <Link to="/pricing">Pricing</Link>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); message.info('SpotWay Privacy Policy') }}>Privacy Policy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); message.info('SpotWay Terms of Service') }}>Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AccountHomePage
