import { useState } from 'react'
import { App as AntApp } from 'antd'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import './RegisterPage.css'

interface PasswordStrength {
  score: number
  label: string
  color: string
  barClass: string
}

function calculatePasswordStrength(pass: string): PasswordStrength {
  if (!pass) {
    return { score: 0, label: '', color: '', barClass: '' }
  }

  let score = 0
  if (pass.length >= 8) score += 1
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[^A-Za-z0-9]/.test(pass)) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Mật khẩu yếu', color: '#f87171', barClass: 'reg-strength__bar--active-weak' }
    case 2:
      return { score: 2, label: 'Mật khẩu trung bình', color: '#fbbf24', barClass: 'reg-strength__bar--active-fair' }
    case 3:
      return { score: 3, label: 'Mật khẩu mạnh', color: '#22D3EE', barClass: 'reg-strength__bar--active-good' }
    case 4:
      return { score: 4, label: 'Mật khẩu rất mạnh', color: '#34d399', barClass: 'reg-strength__bar--active-strong' }
    default:
      return { score: 0, label: 'Quá ngắn', color: '#f87171', barClass: 'reg-strength__bar--active-weak' }
  }
}

export function RegisterPage() {
  const [fullName, setFullName] = useState('Elena Rostova')
  const [email, setEmail] = useState('elena@metro.com')
  const [password, setPassword] = useState('SpatialGrid!2025#')
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [registerError, setRegisterError] = useState<string | null>(null)

  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const registerUser = useAuthStore((state) => state.register)

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/owner/dashboard" replace />
  }

  const strength = calculatePasswordStrength(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError(null)

    if (!fullName.trim()) {
      setRegisterError('Vui lòng nhập họ và tên của bạn.')
      return
    }

    if (!email.trim()) {
      setRegisterError('Vui lòng nhập email công việc.')
      return
    }

    if (!password) {
      setRegisterError('Vui lòng nhập mật khẩu.')
      return
    }

    if (password.length < 8) {
      setRegisterError('Mật khẩu phải có tối thiểu 8 ký tự.')
      return
    }

    if (!agreedToTerms) {
      setRegisterError('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật.')
      return
    }

    setSubmitting(true)
    try {
      const res = await registerUser(fullName.trim(), email.trim(), password)
      message.success('Mã xác thực đã được gửi tới email của bạn!')
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, {
        state: {
          email: email.trim(),
          demoCode: res?.demoCode,
          fullName: fullName.trim(),
        },
        replace: true,
      })
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Đăng ký không thành công. Vui lòng thử lại.'
      setRegisterError(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSsoClick = (provider: string) => {
    message.info(`Đăng ký qua ${provider} đang ở chế độ thử nghiệm. Vui lòng đăng ký trực tiếp bằng biểu mẫu.`)
  }

  return (
    <div className="reg-root">
      {/* ── Ambient Aurora Light Blooms ── */}
      <div className="reg-bloom reg-bloom--1" />
      <div className="reg-bloom reg-bloom--2" />
      <div className="reg-bloom reg-bloom--3" />

      {/* ========================================== */}
      {/* LEFT PANEL: Account Creation Form (50%)   */}
      {/* ========================================== */}
      <section className="reg-left">
        {/* Top Brand Header */}
        <header className="reg-header">
          <Link to="/" className="reg-brand" title="Về trang chủ SpotWay">
            <div className="reg-brand__logo">
              <div className="reg-brand__inner">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  near_me
                </span>
              </div>
            </div>
            <div className="reg-brand__name">
              SpotWay
              <span className="reg-brand__badge">SPATIAL</span>
            </div>
          </Link>

          <Link to="/login" className="reg-header__link">
            <span>Đã có tài khoản?</span>
            <span className="reg-header__link-accent">Đăng nhập</span>
          </Link>
        </header>

        {/* Center Form Content */}
        <div className="reg-form-wrapper">
          {/* Headline & Subtitle */}
          <div className="reg-intro">
            <h1 className="reg-title">Tạo tài khoản</h1>
            <p className="reg-subtitle">
              Bắt đầu xây dựng bản đồ không gian chuẩn xác đến từng milimet ngay hôm nay.
            </p>
          </div>

          {/* Form */}
          <form className="reg-form" onSubmit={handleSubmit}>
            {/* Error Notification Banner */}
            {registerError && (
              <div className="reg-error">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  error
                </span>
                <span>{registerError}</span>
              </div>
            )}

            {/* Full Name Field */}
            <div className="reg-field">
              <label className="reg-label" htmlFor="reg-fullname">
                Họ và tên
              </label>
              <div className="reg-input-group">
                <span className="reg-input-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                    person
                  </span>
                </span>
                <input
                  id="reg-fullname"
                  type="text"
                  className="reg-input"
                  placeholder="Elena Rostova"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Work Email Field */}
            <div className="reg-field">
              <label className="reg-label" htmlFor="reg-email">
                Email công việc
              </label>
              <div className="reg-input-group">
                <span className="reg-input-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                    mail
                  </span>
                </span>
                <input
                  id="reg-email"
                  type="email"
                  className="reg-input"
                  placeholder="elena@metro.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Field + Eye Toggle + Strength Meter */}
            <div className="reg-field">
              <label className="reg-label" htmlFor="reg-password">
                Mật khẩu
              </label>
              <div className="reg-input-group">
                <span className="reg-input-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                    lock
                  </span>
                </span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="reg-input reg-input--password"
                  placeholder="Nhập mật khẩu an toàn (tối thiểu 8 ký tự)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="reg-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '19px' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* 4-Segment Strength Meter */}
              {password.length > 0 && (
                <div className="reg-strength">
                  <div className="reg-strength__meta">
                    <span className="reg-strength__label">Độ mạnh</span>
                    <span className="reg-strength__status" style={{ color: strength.color }}>
                      <span className="reg-strength__dot" style={{ backgroundColor: strength.color }} />
                      {strength.label}
                    </span>
                  </div>
                  <div className="reg-strength__bars">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`reg-strength__bar ${
                          strength.score >= level ? strength.barClass : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Terms Checkbox */}
            <div className="reg-terms" onClick={() => setAgreedToTerms(!agreedToTerms)}>
              <div className={`reg-checkbox ${agreedToTerms ? 'reg-checkbox--checked' : ''}`}>
                <span className="material-symbols-outlined">check</span>
              </div>
              <span className="reg-terms__text">
                Tôi đồng ý với{' '}
                <a
                  href="#terms"
                  className="reg-terms__link"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    message.info('Điều khoản dịch vụ SpotWay Spatial Intelligence v2.4')
                  }}
                >
                  Điều khoản dịch vụ
                </a>{' '}
                và{' '}
                <a
                  href="#privacy"
                  className="reg-terms__link"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    message.info('Chính sách bảo mật dữ liệu không gian SpotWay')
                  }}
                >
                  Chính sách bảo mật
                </a>
              </span>
            </div>

            {/* Submit CTA Button */}
            <button type="submit" className="reg-btn-submit" disabled={submitting}>
              <span>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>

          {/* SSO Divider */}
          <div className="reg-sso-divider">
            <div className="reg-sso-divider__line" />
            <span className="reg-sso-divider__text">hoặc tiếp tục với</span>
          </div>

          {/* SSO Buttons: Google & Microsoft */}
          <div className="reg-sso-grid">
            <button type="button" className="reg-sso-btn" onClick={() => handleSsoClick('Google')}>
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

            <button type="button" className="reg-sso-btn" onClick={() => handleSsoClick('Microsoft')}>
              <svg width="18" height="18" viewBox="0 0 23 23" style={{ flexShrink: 0 }}>
                <path d="M1 1h10v10H1z" fill="#f35325" />
                <path d="M12 1h10v10H12z" fill="#81bc06" />
                <path d="M1 12h10v10H1z" fill="#05a6f0" />
                <path d="M12 12h10v10H12z" fill="#ffba08" />
              </svg>
              <span>Microsoft</span>
            </button>
          </div>

          {/* Direct Sign-In Helper */}
          <p className="reg-signin-helper">
            Đã có tài khoản?
            <Link to="/login">Đăng nhập</Link>
          </p>
        </div>

        {/* Left Panel Footer */}
        <footer className="reg-footer">
          <span>© 2026 SpotWay Inc.</span>
          <div className="reg-footer__links">
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault()
                message.info('Điều khoản dịch vụ SpotWay')
              }}
            >
              Điều khoản
            </a>
            <span style={{ opacity: 0.3 }}>·</span>
            <a
              href="#privacy"
              onClick={(e) => {
                e.preventDefault()
                message.info('Chính sách bảo mật SpotWay')
              }}
            >
              Bảo mật
            </a>
            <span style={{ opacity: 0.3 }}>·</span>
            <div className="reg-footer__status">
              <span className="reg-footer__status-dot" />
              <span>Hệ thống trực tuyến</span>
            </div>
          </div>
        </footer>
      </section>

      {/* ========================================== */}
      {/* RIGHT PANEL: Showcase Panel (50%)         */}
      {/* ========================================== */}
      <section className="reg-right">
        {/* Visual Spatial Grid & Light Radiance */}
        <div className="reg-spatial-grid" />
        <div className="reg-right-bloom--violet" />
        <div className="reg-right-bloom--cyan" />

        {/* Top Floating Badges Cluster */}
        <div className="reg-top-badges">
          <div className="reg-badge-pill">
            <span>⚡</span>
            <span>Không gian sẵn sàng trong 2 phút</span>
          </div>
          <div className="reg-badge-pill reg-badge-pill--cyan">
            <span>🧠</span>
            <span>AI chuyển đổi mặt bằng sang 3D NavMesh</span>
          </div>
        </div>

        {/* Middle: Isometric 3D Multi-Floor Building Showcase */}
        <div className="reg-iso-stage">
          <div className="reg-iso-container">
            {/* ================= LEVEL 3 (Top - Executive) ================= */}
            <div className="reg-iso-plate reg-iso-plate--3">
              <div className="reg-plate-grid" />
              <div className="reg-plate-route">
                <div className="reg-route-line">
                  <div className="reg-beacon-node">
                    <div className="reg-beacon-ping" />
                  </div>
                </div>
              </div>
              <div className="reg-telemetry-pin">
                <span>GPS-FREE FIX</span>
              </div>
            </div>

            {/* Floor 3 Anchor Callout */}
            <div className="reg-floor-anchor reg-floor-anchor--3">
              <div className="reg-floor-pill">3F Executive</div>
              <div className="reg-floor-line" />
            </div>

            {/* ================= LEVEL 2 (Middle - Retail Hub) ================= */}
            <div className="reg-iso-plate reg-iso-plate--2">
              <div className="reg-plate-grid" />
              <div
                style={{
                  position: 'absolute',
                  inset: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  opacity: 0.7,
                }}
              >
                <div
                  style={{
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: '#958ea0',
                  }}
                >
                  Terminal B
                </div>
                <div
                  style={{
                    border: '1px solid rgba(34, 211, 238, 0.35)',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(34, 211, 238, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: '#5de6ff',
                    boxShadow: 'inset 0 0 10px rgba(34, 211, 238, 0.1)',
                  }}
                >
                  Retail Zone
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '18px',
                  left: '32px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#8B5CF6',
                  boxShadow: '0 0 10px #8B5CF6',
                }}
              />
            </div>

            {/* Floor 2 Anchor Callout */}
            <div className="reg-floor-anchor reg-floor-anchor--2">
              <div className="reg-floor-pill reg-floor-pill--cyan">2F Retail Hub</div>
              <div className="reg-floor-line reg-floor-line--cyan" />
            </div>

            {/* ================= LEVEL 1 (Base - Concourse) ================= */}
            <div className="reg-iso-plate reg-iso-plate--1">
              <div className="reg-plate-grid" />
              <div
                style={{
                  position: 'absolute',
                  left: '24px',
                  right: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #8B5CF6, transparent)',
                  boxShadow: '0 0 10px #8B5CF6',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#34d399',
                  }}
                />
                <span
                  style={{
                    fontSize: '8px',
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: '#958ea0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Cổng đón / Turnstiles
                </span>
              </div>
            </div>

            {/* Floor 1 Anchor Callout */}
            <div className="reg-floor-anchor reg-floor-anchor--1">
              <div className="reg-floor-pill reg-floor-pill--white">1F Concourse</div>
              <div className="reg-floor-line reg-floor-line--white" />
            </div>
          </div>
        </div>

        {/* Bottom Cluster: Testimonial & Trust Badges */}
        <div className="reg-bottom-cluster">
          {/* Floating Glass Testimonial Card */}
          <div className="reg-testimonial">
            <div className="reg-testimonial__top">
              <div className="reg-testimonial__author">
                <div className="reg-testimonial__avatar">
                  <div className="reg-testimonial__avatar-inner">ER</div>
                </div>
                <div>
                  <h4 className="reg-testimonial__name">Elena Rostova</h4>
                  <p className="reg-testimonial__role">Phó Chủ tịch Vận hành @ Sân bay Quốc tế</p>
                </div>
              </div>

              {/* 5 Golden Stars */}
              <div className="reg-testimonial__stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
            <p className="reg-testimonial__quote">
              &ldquo;Rút ngắn thời gian thiết lập sơ đồ điều hướng từ vài tháng xuống dưới 48 giờ. Hành khách nhận hướng
              dẫn lộ trình từng ngã rẽ trực tiếp trên trình duyệt điện thoại mà không cần cài thêm ứng dụng.&rdquo;
            </p>
          </div>

          {/* Tagline & Enterprise Badges */}
          <div className="reg-compliance-row">
            <p className="reg-tagline">
              Find your spot. <span className="reg-tagline-accent">Find your way.</span>
            </p>
            <div className="reg-badges-group">
              <div className="reg-cert-badge">
                <span className="material-symbols-outlined" style={{ color: '#34d399' }}>
                  verified_user
                </span>
                <span>SOC 2 Type II</span>
              </div>
              <div className="reg-cert-badge">
                <span className="material-symbols-outlined" style={{ color: '#22D3EE' }}>
                  bolt
                </span>
                <span>99.99% Uptime SLA</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default RegisterPage

