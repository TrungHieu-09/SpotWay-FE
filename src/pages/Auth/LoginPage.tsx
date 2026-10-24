import { useEffect, useState } from 'react'
import { App as AntApp } from 'antd'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { roleLabel, useAuthStore } from '../../auth/store'
import type { Role } from '../../types/auth'
import './LoginPage.css'

interface DemoAccount {
  role: Role
  label: string
  roleTag: string
  email: string
  desc: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: 'admin', label: 'Admin', roleTag: 'Quản trị viên', email: 'admin@demo.vn', desc: 'Toàn quyền cấu hình hệ thống' },
  { role: 'building_owner', label: 'Chủ tòa nhà', roleTag: 'Tổ hợp', email: 'owner1@demo.vn', desc: 'Quản lý bất động sản & số liệu' },
  { role: 'building_manager', label: 'Quản lý', roleTag: 'Vận hành', email: 'manager1a@demo.vn', desc: 'Điều phối tầng, sơ đồ & thiết bị' },
  { role: 'store_owner', label: 'Gian hàng', roleTag: 'Kinh doanh', email: 'lumi@demo.vn', desc: 'Quản lý quầy & chương trình ưu đãi' },
]

function homeForRole(role: Role): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'building_owner':
      return '/owner/dashboard'
    case 'building_manager':
      return '/manager'
    case 'store_owner':
      return '/store/profile'
    default:
      return '/owner/dashboard'
  }
}

export function LoginPage() {
  const [workspace, setWorkspace] = useState('metro-airport-corp')
  const [email, setEmail] = useState('owner1@demo.vn')
  const [password, setPassword] = useState('Demo@123')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedDemoRole, setSelectedDemoRole] = useState<Role | null>('building_owner')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3)
  const [activeFloor, setActiveFloor] = useState<'1F' | '2F' | '3F'>('2F')
  const [lang, setLang] = useState<'EN' | 'VI'>('EN')

  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const login = useAuthStore((state) => state.login)

  // Auto redirect if already authenticated
  useEffect(() => {
    if (user) {
      const redirect = new URLSearchParams(location.search).get('redirect')
      const nextPath = redirect?.startsWith('/') ? redirect : undefined
      navigate(nextPath ?? homeForRole(user.role), { replace: true })
    }
  }, [navigate, user, location.search])

  const handleSelectDemo = (account: DemoAccount) => {
    setSelectedDemoRole(account.role)
    setEmail(account.email)
    setPassword('Demo@123')
    setLoginError(null)
  }

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setSubmitting(true)
    setLoginError(null)

    try {
      await login(loginEmail.trim(), loginPass)
      const redirect = new URLSearchParams(location.search).get('redirect')
      const nextPath = redirect?.startsWith('/') ? redirect : undefined
      const nextUser = useAuthStore.getState().user
      const targetRoute = nextPath ?? homeForRole(nextUser?.role ?? 'building_owner')

      message.success(lang === 'EN' ? 'Signed in successfully' : 'Đăng nhập thành công')
      navigate(targetRoute, { replace: true })
    } catch (err) {
      const remaining = Math.max(0, attemptsRemaining - 1)
      setAttemptsRemaining(remaining)
      const errorMsg =
        err instanceof Error ? err.message : lang === 'EN' ? 'Incorrect email or password.' : 'Sai email hoặc mật khẩu.'
      
      setLoginError(
        lang === 'EN'
          ? `${errorMsg} ${remaining > 0 ? `${remaining} attempts remaining.` : 'Account temporarily locked.'}`
          : `${errorMsg} ${remaining > 0 ? `Còn ${remaining} lần thử.` : 'Tài khoản tạm khóa.'}`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setLoginError(lang === 'EN' ? 'Please enter your email address.' : 'Vui lòng nhập email.')
      return
    }
    if (!password) {
      setLoginError(lang === 'EN' ? 'Please enter your password.' : 'Vui lòng nhập mật khẩu.')
      return
    }
    performLogin(email, password)
  }

  const handleSsoClick = (provider: string) => {
    message.info(
      lang === 'EN'
        ? `Single Sign-On with ${provider} is in demo sandbox mode. Please use Quick Demo Roles to sign in.`
        : `Xác thực qua ${provider} đang ở chế độ thử nghiệm. Vui lòng chọn vai trò demo để trải nghiệm.`
    )
  }

  return (
    <div className="spotway-auth-root">
      {/* Ambient Radiant Mesh Background Glows */}
      <div className="auth-ambient-mesh" aria-hidden="true">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
        <div className="ambient-orb-3" />
        <div className="ambient-orb-4" />
        <div className="auth-grid-overlay" />
      </div>

      {/* Primary Split Viewport */}
      <main className="auth-split-main">
        {/* ========================================================================= */}
        {/* LEFT PANEL: SPATIAL SHOWCASE & 3D TELEMETRY SIMULATION                    */}
        {/* ========================================================================= */}
        <section className="auth-left-showcase">
          {/* Top Brand Anchor & Version Telemetry */}
          <div className="auth-showcase-header">
            <Link to="/" className="auth-brand-badge" title="SpotWay Home">
              <div className="brand-icon-box">
                <div className="brand-icon-inner">
                  <span
                    className="material-symbols-outlined"
                    style={{
                      color: '#5de6ff',
                      fontSize: '24px',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    near_me
                  </span>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(93, 230, 255, 0.1)',
                      filter: 'blur(4px)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              <div className="brand-title-wrap">
                <div className="brand-name-row">
                  <span className="brand-name-text">SpotWay</span>
                  <span className="brand-ping-dot" />
                </div>
                <p className="brand-subtitle-text">Spatial Intelligence OS</p>
              </div>
            </Link>

            {/* System Architecture Pill Badge */}
            <div className="system-arch-pill">
              <span className="system-status-dot" />
              <span style={{ color: '#cbc3d7', fontWeight: 600, letterSpacing: '0.04em' }}>
                v2.4 Spatial Auth
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: 300 }}>|</span>
              <span style={{ color: '#5de6ff', fontWeight: 500 }}>UWB Synced</span>
            </div>
          </div>

          {/* Center Showcase: Isometric 3D Multi-Floor Blueprint Simulation */}
          <div className="iso-stage-wrapper">
            {/* Floor Plate 3: 3F Executive Suites (Top Level) */}
            <div
              className={`iso-plate iso-plate-3 ${activeFloor === '3F' ? 'border-[#5de6ff] ring-1 ring-[#5de6ff]/50' : ''}`}
              onClick={() => setActiveFloor('3F')}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(93, 230, 255, 0.15)',
                    color: '#5de6ff',
                    border: '1px solid rgba(93, 230, 255, 0.3)',
                  }}
                >
                  3F · Executive Suites
                </span>
                <span className="material-symbols-outlined" style={{ color: 'rgba(93, 230, 255, 0.6)', fontSize: '18px' }}>
                  wifi_tethering
                </span>
              </div>

              {/* Room Grid Breakdown */}
              <div
                style={{
                  position: 'absolute',
                  inset: '3rem 1rem 1rem 1rem',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '0.75rem',
                  padding: '0.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.02)' }} />
                <div
                  style={{
                    border: '1px solid rgba(93, 230, 255, 0.35)',
                    borderRadius: '0.5rem',
                    backgroundColor: 'rgba(93, 230, 255, 0.05)',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      left: '6px',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '9px',
                      color: '#5de6ff',
                      fontWeight: 600,
                    }}
                  >
                    Suite 302
                  </span>
                  {/* Waypoint Destination Target Beacon */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '9999px',
                      backgroundColor: '#5de6ff',
                      boxShadow: '0 0 8px #5de6ff',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '9999px',
                      backgroundColor: '#5de6ff',
                      animation: 'ping-soft 1.8s infinite',
                    }}
                  />
                </div>
                <div style={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.02)' }} />
              </div>
            </div>

            {/* Floor Plate 2: 2F Retail Hub (Active Focal Level) */}
            <div
              className="iso-plate iso-plate-2"
              onClick={() => setActiveFloor('2F')}
              style={{ cursor: 'pointer' }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(135deg, rgba(160, 120, 255, 0.12) 0%, transparent 50%, rgba(93, 230, 255, 0.15) 100%)',
                  pointerEvents: 'none',
                }}
              />
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#a078ff',
                      color: '#340080',
                      boxShadow: '0 2px 8px rgba(160, 120, 255, 0.35)',
                    }}
                  >
                    2F · Retail Hub (Active)
                  </span>
                  <span className="brand-ping-dot" style={{ backgroundColor: '#5de6ff' }} />
                </div>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', color: '#958ea0' }}>
                  984 sq.m
                </span>
              </div>

              {/* Indoor Path Vector Simulation Overlay */}
              <svg
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
                fill="none"
                viewBox="0 0 380 240"
              >
                <defs>
                  <linearGradient id="splineGradient" x1="0%" x2="100%" y1="100%" y2="0%">
                    <stop offset="0%" stopColor="#5de6ff" />
                    <stop offset="60%" stopColor="#a078ff" />
                    <stop offset="100%" stopColor="#f8acff" />
                  </linearGradient>
                </defs>
                <path
                  d="M 60 170 Q 150 150 190 100 T 310 65"
                  stroke="url(#splineGradient)"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  opacity="0.85"
                />
                {/* Elevation Transition Beacon Circle */}
                <circle cx="190" cy="100" r="5" fill="#22D3EE" />
                <circle cx="190" cy="100" r="10" stroke="#22D3EE" strokeOpacity="0.6" strokeWidth="1.5" />
              </svg>

              {/* Zone structure */}
              <div
                style={{
                  position: 'absolute',
                  inset: '3.25rem 1.25rem 1rem 1.25rem',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '1rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.625rem',
                  padding: '0.625rem',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '0.625rem', backgroundColor: 'rgba(255, 255, 255, 0.02)' }} />
                <div style={{ border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '0.625rem', backgroundColor: 'rgba(255, 255, 255, 0.02)' }} />
                <div
                  style={{
                    gridColumn: 'span 2',
                    border: '1px solid rgba(93, 230, 255, 0.35)',
                    borderRadius: '0.625rem',
                    backgroundColor: 'rgba(93, 230, 255, 0.06)',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '10px', color: '#5de6ff', fontWeight: 600 }}>
                    Zone 2-North
                  </span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '9px', color: '#958ea0' }}>
                    74% Occ
                  </span>
                </div>
              </div>
            </div>

            {/* Floor Plate 1: 1F Terminal Concourse (Ground Base) */}
            <div
              className={`iso-plate iso-plate-1 ${activeFloor === '1F' ? 'border-[#5de6ff] ring-1 ring-[#5de6ff]/50' : ''}`}
              onClick={() => setActiveFloor('1F')}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#343344',
                    color: '#cbc3d7',
                  }}
                >
                  1F · Terminal Concourse
                </span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', color: '#958ea0' }}>
                  Main Gate 1-4
                </span>
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: '3.5rem 1.5rem 1.25rem 1.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                }}
              />
            </div>

            {/* ================================================================= */}
            {/* DYNAMIC FLOATING GLASS HUD CARDS                                  */}
            {/* ================================================================= */}
            {/* HUD Pill 1: Dynamic Route ETA Tooltip (Top Right) */}
            <div className="hud-card-eta">
              <div className="hud-glass-box glow-cyan">
                <div className="hud-icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                    directions_walk
                  </span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                      Room 3.12
                    </span>
                    <span style={{ color: '#5de6ff', fontWeight: 700 }}>·</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', color: '#5de6ff', fontWeight: 600 }}>
                      2 min walk
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '9999px',
                        backgroundColor: '#34d399',
                        boxShadow: '0 0 6px #34d399',
                      }}
                    />
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '10px', color: '#958ea0' }}>
                      Optimized Stairwell Route
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* HUD Pill 2: Floating Floor Selector Stack (Center Left) */}
            <div className="hud-floor-selector">
              <div className="floor-stack-box">
                <button
                  type="button"
                  className={activeFloor === '3F' ? 'floor-btn-active' : 'floor-btn-inactive'}
                  onClick={() => setActiveFloor('3F')}
                >
                  3F
                  {activeFloor === '3F' && <span className="brand-ping-dot" style={{ width: '4px', height: '4px' }} />}
                </button>
                <button
                  type="button"
                  className={activeFloor === '2F' ? 'floor-btn-active' : 'floor-btn-inactive'}
                  onClick={() => setActiveFloor('2F')}
                >
                  <span>2F</span>
                  <span className="brand-ping-dot" style={{ width: '5px', height: '5px', backgroundColor: '#5de6ff' }} />
                </button>
                <button
                  type="button"
                  className={activeFloor === '1F' ? 'floor-btn-active' : 'floor-btn-inactive'}
                  onClick={() => setActiveFloor('1F')}
                >
                  1F
                  {activeFloor === '1F' && <span className="brand-ping-dot" style={{ width: '4px', height: '4px' }} />}
                </button>
              </div>
            </div>

            {/* HUD Pill 3: Accessibility Badge (Bottom Left) */}
            <div className="hud-accessibility">
              <div
                style={{
                  padding: '0.5rem 0.875rem',
                  borderRadius: '1rem',
                  background: 'rgba(41, 40, 57, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ color: '#5de6ff', fontSize: '19px' }}>
                  accessible
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', color: '#ffffff', fontWeight: 500 }}>
                    Wheelchair route on
                  </span>
                  <span className="material-symbols-outlined" style={{ color: '#5de6ff', fontSize: '16px' }}>
                    check_circle
                  </span>
                </div>
              </div>
            </div>

            {/* HUD Pill 4: Telemetry Precision Chip (Bottom Right) */}
            <div className="hud-telemetry-chip">
              <div
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '9999px',
                  background: 'rgba(13, 13, 28, 0.85)',
                  border: '1px solid rgba(93, 230, 255, 0.35)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span className="brand-ping-dot" style={{ width: '7px', height: '7px' }} />
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', color: '#cbc3d7', fontWeight: 500 }}>
                  UWB Precision: <span style={{ color: '#5de6ff', fontWeight: 700 }}>&lt;10cm</span> · 48 Beacons Synced
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Atmospheric Tagline & Validation Quote */}
          <div className="auth-showcase-bottom">
            <div>
              <h2 className="showcase-hero-title">
                Find your spot. Find your way.
              </h2>
              <p className="showcase-hero-desc">
                Real-time digital twins &amp; zero-latency indoor positioning infrastructure.
              </p>
            </div>

            <div className="showcase-validation-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#958ea0' }}>
                <span className="material-symbols-outlined" style={{ color: '#5de6ff', fontSize: '18px' }}>
                  verified
                </span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', color: '#958ea0' }}>
                  Empowering 500+ mega-facilities worldwide
                </span>
              </div>

              {/* Progress Indicator Dots */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    width: '1.5rem',
                    height: '0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: '#a078ff',
                    boxShadow: '0 0 10px #a078ff',
                  }}
                />
                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#494454' }} />
                <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', backgroundColor: '#494454' }} />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: SIGN IN & TENANT ACCESS FORM                                 */}
        {/* ========================================================================= */}
        <section className="auth-right-panel">
          {/* Top Right Auxiliary Direct Link */}
          <div className="auth-top-auxiliary">
            <Link to="/guest" className="guest-terminal-link" title="Open Guest Navigation">
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#5de6ff' }}>
                qr_code_scanner
              </span>
              <span>Zero-Download Guest Terminal</span>
            </Link>
          </div>

          {/* Main Sign In Glass Card Container */}
          <div className="auth-card-content">
            {/* Header Group */}
            <div className="auth-header-group">
              <div className="secure-badge">
                <span className="secure-badge-dot" />
                <span className="secure-badge-text">SECURE SPATIAL ACCESS</span>
              </div>
              <h1 className="auth-form-title">Welcome back</h1>
              <p className="auth-form-subtitle">
                Sign in to manage your spaces and floor telemetry.
              </p>
            </div>

            {/* Quick Demo Role Selection (PRESERVED FEATURE) */}
            <div className="demo-role-picker-card">
              <div className="demo-picker-title-row">
                <span className="demo-picker-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#a078ff' }}>
                    badge
                  </span>
                  QUICK DEMO ACCOUNTS
                </span>
                <span className="demo-picker-hint">1-Click role fill &amp; test</span>
              </div>

              <div className="demo-role-chips">
                {DEMO_ACCOUNTS.map((account) => {
                  const isActive = selectedDemoRole === account.role
                  return (
                    <button
                      key={account.role}
                      type="button"
                      className={`demo-chip-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleSelectDemo(account)}
                      title={`${account.desc} (${account.email})`}
                    >
                      <span>{account.label}</span>
                      <span className="demo-chip-role-tag">{account.roleTag}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sign-in Form */}
            <form onSubmit={handleSubmit}>
              {/* Workspace Domain Input */}
              <div className="form-field-group">
                <label className="field-label" htmlFor="workspace-field">
                  Workspace
                </label>
                <div className="field-input-wrapper">
                  <div className="field-prefix-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                      domain
                    </span>
                  </div>
                  <input
                    id="workspace-field"
                    type="text"
                    className="field-text-input"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    placeholder="organization-subdomain"
                    autoComplete="organization"
                  />
                  <div className="field-suffix-badge">.spotway.app</div>
                </div>
                <p className="field-helper-text">Your organization's spatial workspace handle</p>
              </div>

              {/* Email Address Input */}
              <div className="form-field-group">
                <label className="field-label" htmlFor="email-field">
                  Email address
                </label>
                <div className="field-input-wrapper">
                  <div className="field-prefix-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                      mail
                    </span>
                  </div>
                  <input
                    id="email-field"
                    type="email"
                    className="field-text-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setLoginError(null)
                    }}
                    placeholder="name@facility.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Input with show/hide toggle */}
              <div className="form-field-group">
                <label className="field-label" htmlFor="password-field">
                  Password
                </label>
                <div className={`field-input-wrapper ${loginError ? 'error-state' : ''}`}>
                  <div className={`field-prefix-icon ${loginError ? 'error-icon' : ''}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                      lock
                    </span>
                  </div>
                  <input
                    id="password-field"
                    type={showPassword ? 'text' : 'password'}
                    className="field-text-input"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setLoginError(null)
                    }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="field-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

                {/* Soft Inline Error Banner State */}
                {loginError && (
                  <div className="auth-inline-error-box">
                    <span className="material-symbols-outlined" style={{ fontSize: '18px', flexShrink: 0 }}>
                      warning
                    </span>
                    <span>{loginError}</span>
                  </div>
                )}
              </div>

              {/* Checkbox & Forgot Password Controls Row */}
              <div className="form-controls-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="custom-checkbox"
                  />
                  <span>Remember me for 30 days</span>
                </label>

                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot password?
                </Link>
              </div>

              {/* Primary Sign In Action Button */}
              <button type="submit" className="auth-submit-btn" disabled={submitting}>
                {submitting ? (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.4)',
                        borderTopColor: '#ffffff',
                        borderRadius: '9999px',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Social SSO Divider */}
            <div className="sso-divider-wrapper">
              <div className="sso-divider-line" />
              <div className="sso-divider-text-container">
                <span className="sso-divider-badge">or continue with</span>
              </div>
            </div>

            {/* Social SSO Buttons Grid */}
            <div className="sso-buttons-grid">
              {/* Google Button */}
              <button type="button" className="sso-btn" onClick={() => handleSsoClick('Google')}>
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.2 8.9 5 12 5z"
                    fill="#EA4335"
                  />
                  <path
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
                    fill="#4285F4"
                  />
                  <path
                    d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.2-6.7-5.3L1.6 16C3.5 19.8 7.4 23 12 23z"
                    fill="#34A853"
                  />
                </svg>
                <span>Google</span>
              </button>

              {/* Microsoft Button */}
              <button type="button" className="sso-btn" onClick={() => handleSsoClick('Microsoft')}>
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                  <path d="M1 1h10v10H1z" fill="#F25022" />
                  <path d="M13 1h10v10H13z" fill="#7FBA00" />
                  <path d="M1 13h10v10H1z" fill="#00A4EF" />
                  <path d="M13 13h10v10H13z" fill="#FFB900" />
                </svg>
                <span>Microsoft</span>
              </button>
            </div>

            {/* Secondary Guidance Links */}
            <div className="auth-secondary-links">
              <p className="demo-request-text">
                New to SpotWay?{' '}
                <a
                  className="demo-request-link"
                  onClick={() =>
                    message.info('Demo request terminal received. Our spatial architecture team will reach out!')
                  }
                >
                  Request a demo
                </a>
              </p>

              <div>
                <Link to="/guest" className="guest-kiosk-link">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#d0bcff' }}>
                    qr_code
                  </span>
                  <span>Continue as temporary visitor via QR Kiosk</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Panel Footer Utility Bar */}
          <footer className="auth-panel-footer">
            <div className="footer-legal-links">
              <a href="#terms" onClick={(e) => { e.preventDefault(); message.info('SpotWay Terms of Service v2.4') }}>
                Terms of Service
              </a>
              <span>·</span>
              <a href="#privacy" onClick={(e) => { e.preventDefault(); message.info('SpotWay Privacy & Spatial Data Policy') }}>
                Privacy Policy
              </a>
              <span>·</span>
              <a href="#compliance" onClick={(e) => { e.preventDefault(); message.info('SpotWay ISO 27001 Certified Infrastructure') }}>
                ISO 27001
              </a>
            </div>

            {/* Language Switcher Pill Toggle */}
            <div className="lang-switcher-pill">
              <button
                type="button"
                className={`lang-btn ${lang === 'EN' ? 'active' : ''}`}
                onClick={() => setLang('EN')}
              >
                EN
              </button>
              <button
                type="button"
                className={`lang-btn ${lang === 'VI' ? 'active' : ''}`}
                onClick={() => setLang('VI')}
              >
                VI
              </button>
            </div>
          </footer>
        </section>
      </main>
    </div>
  )
}
export default LoginPage
