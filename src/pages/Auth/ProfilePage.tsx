import { useState, useEffect } from 'react'
import { App as AntApp } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore, roleLabel } from '../../auth/store'
import { SpotWayNavbar } from '../../components/layout/SpotWayNavbar'
import './ProfilePage.css'

export function ProfilePage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const changePassword = useAuthStore((state) => state.changePassword)

  // Language state
  const [lang, setLang] = useState<'VI' | 'EN'>('VI')

  // Profile display name
  const [displayName, setDisplayName] = useState(
    user?.name || (user?.email ? user.email.split('@')[0] : 'User')
  )
  const [nameInput, setNameInput] = useState(displayName)
  const [savingName, setSavingName] = useState(false)

  // Security & Password form
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [updatingPass, setUpdatingPass] = useState(false)

  // Preferences
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)

  // Sync displayName when user object updates
  useEffect(() => {
    if (user) {
      const realName = user.name || (user.email ? user.email.split('@')[0] : 'User')
      setDisplayName(realName)
      setNameInput(realName)
    }
  }, [user])

  const userEmail = user?.email || 'user@spotway.vn'
  const userInitial = (displayName || 'U').charAt(0).toUpperCase()
  const userIdTag = user?.id ? `usr_${user.id.slice(0, 8)}` : 'usr_guest'
  const userRoleText = user?.role ? roleLabel(user.role) : 'Người dùng tự do'

  // Calculate password strength (0-4)
  const getPassStrength = (pass: string) => {
    if (!pass) return { score: 0, label: lang === 'VI' ? 'Chưa nhập' : 'Not entered' }
    let s = 0
    if (pass.length >= 8) s++
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) s++
    if (/\d/.test(pass)) s++
    if (/[^A-Za-z0-9]/.test(pass)) s++
    const labelsVI = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh (3/4)', 'Rất mạnh (4/4)']
    const labelsEN = ['Very weak', 'Weak', 'Fair', 'Strong (3/4)', 'Very strong (4/4)']
    const labels = lang === 'VI' ? labelsVI : labelsEN
    return { score: s, label: labels[s] }
  }

  const passStrength = getPassStrength(newPass)

  // Handle Save Display Name
  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    if (!trimmed) {
      message.error(lang === 'VI' ? 'Tên hiển thị không được để trống' : 'Display name cannot be empty')
      return
    }
    setSavingName(true)
    setTimeout(() => {
      setDisplayName(trimmed)
      if (user) {
        const updated = { ...user, name: trimmed }
        useAuthStore.setState({ user: updated })
        try {
          window.localStorage.setItem('spotway.user', JSON.stringify(updated))
        } catch {
          // ignore storage error
        }
      }
      setSavingName(false)
      message.success(lang === 'VI' ? 'Đã cập nhật tên hiển thị thành công!' : 'Display name updated successfully!')
    }, 400)
  }

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPass) {
      message.error(lang === 'VI' ? 'Vui lòng nhập mật khẩu hiện tại' : 'Please enter your current password')
      return
    }
    if (newPass.length < 6) {
      message.error(lang === 'VI' ? 'Mật khẩu mới tối thiểu 6 ký tự' : 'New password must be at least 6 characters')
      return
    }
    if (newPass !== confirmPass) {
      message.error(lang === 'VI' ? 'Xác nhận mật khẩu mới không khớp' : 'Password confirmation does not match')
      return
    }

    setUpdatingPass(true)
    try {
      await changePassword(currentPass, newPass)
      message.success(lang === 'VI' ? 'Mật khẩu đã được cập nhật thành công!' : 'Password updated successfully!')
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : (lang === 'VI' ? 'Đổi mật khẩu thất bại' : 'Failed to update password')
      message.error(msg)
    } finally {
      setUpdatingPass(false)
    }
  }

  // Handle 2FA Toggle
  const handleToggle2FA = () => {
    const nextVal = !twoFactorAuth
    setTwoFactorAuth(nextVal)
    message.info(
      nextVal
        ? (lang === 'VI' ? 'Đã kích hoạt xác thực 2 lớp qua email.' : 'Two-factor authentication enabled via email.')
        : (lang === 'VI' ? 'Đã tắt xác thực 2 lớp.' : 'Two-factor authentication disabled.')
    )
  }

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="prf-root">
      {/* ── Top Bar ── */}
      <SpotWayNavbar
        activeTab="account"
        lang={lang}
        onLanguageChange={setLang}
      />

      <main className="prf-container">
        {/* ── HUD Telemetry Line ── */}
        <div className="prf-hud-bar">
          <div className="prf-hud-left">
            <span className="prf-hud-dot" />
            <span>ACCOUNT &amp; PROFILE SETTINGS // SECURITY HUB</span>
          </div>
          <div className="prf-hud-right">
            <span>ID: <strong className="prf-hud-tag">{userIdTag}</strong></span>
            <span>STATUS: <strong className="prf-hud-tag">ACTIVE</strong></span>
          </div>
        </div>

        {/* ── 1. Profile Header Hero Glass Card ── */}
        <section className="prf-glass-card">
          <div className="prf-header-hero">
            <div className="prf-header-user">
              <div className="prf-avatar-big">{userInitial}</div>
              <div className="prf-user-details">
                <div className="prf-name-row">
                  <h1 className="prf-user-name">{displayName}</h1>
                  <span className="prf-badge-verified">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    {lang === 'VI' ? 'Đã xác thực' : 'Verified'}
                  </span>
                </div>
                <p className="prf-user-email">{userEmail}</p>
                <div className="prf-user-id-row">
                  <span>{userRoleText}</span>
                  <span>•</span>
                  <span>Mã: <code className="prf-id-chip">{userIdTag}</code></span>
                </div>
              </div>
            </div>

            <div className="prf-header-actions">
              <Link to="/account" className="prf-btn-ghost" title="Quay lại Trung tâm Workspace">
                <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
                <span>{lang === 'VI' ? 'Không gian làm việc' : 'Workspace Hub'}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. Personal Information Card ── */}
        <section className="prf-glass-card">
          <div className="prf-section-title-row">
            <span className="material-symbols-outlined prf-section-icon">badge</span>
            <h2 className="prf-section-title">
              {lang === 'VI' ? 'Thông tin cá nhân' : 'Personal Information'}
            </h2>
          </div>

          <div className="prf-form-grid">
            <div className="prf-field">
              <label className="prf-field-label">
                {lang === 'VI' ? 'Tên hiển thị' : 'Display Name'}
              </label>
              <div className="prf-input-wrapper">
                <input
                  type="text"
                  className="prf-input"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={lang === 'VI' ? 'Nhập họ và tên' : 'Enter your name'}
                />
                <button
                  type="button"
                  className="prf-input-action-btn"
                  onClick={handleSaveName}
                  disabled={savingName}
                >
                  {savingName ? '...' : (lang === 'VI' ? 'Lưu' : 'Save')}
                </button>
              </div>
              <p className="prf-field-hint">
                {lang === 'VI' ? 'Tên này sẽ hiển thị khi bạn tham gia vào các tòa nhà & workspace.' : 'This name appears across buildings and workspaces.'}
              </p>
            </div>

            <div className="prf-field">
              <label className="prf-field-label">
                {lang === 'VI' ? 'Địa chỉ Email' : 'Email Address'}
              </label>
              <div className="prf-input-wrapper">
                <input
                  type="email"
                  className="prf-input"
                  value={userEmail}
                  disabled
                />
              </div>
              <p className="prf-field-hint">
                {lang === 'VI' ? 'Email dùng để đăng nhập và nhận thông báo bảo mật.' : 'Used for login and security alerts.'}
              </p>
            </div>
          </div>
        </section>

        {/* ── 3. Security & Password Card ── */}
        <section className="prf-glass-card">
          <div className="prf-section-title-row">
            <span className="material-symbols-outlined prf-section-icon prf-section-icon--security">lock</span>
            <h2 className="prf-section-title">
              {lang === 'VI' ? 'Bảo mật & Mật khẩu' : 'Security & Password'}
            </h2>
          </div>

          {/* 2FA Toggle Row */}
          <div className="prf-security-item">
            <div className="prf-security-left">
              <div className="prf-security-icon-box">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div className="prf-security-meta">
                <h4>{lang === 'VI' ? 'Xác thực hai lớp (2FA)' : 'Two-Factor Authentication (2FA)'}</h4>
                <p>
                  {twoFactorAuth
                    ? (lang === 'VI' ? 'Đang kích hoạt — Mã OTP được gửi qua email khi đăng nhập trên thiết bị lạ.' : 'Active — OTP sent via email upon unknown logins.')
                    : (lang === 'VI' ? 'Chưa bật — Khuyến nghị bật để tăng cường an toàn cho tài khoản.' : 'Disabled — Recommended to prevent unauthorized access.')}
                </p>
              </div>
            </div>
            <label className="prf-switch">
              <input type="checkbox" checked={twoFactorAuth} onChange={handleToggle2FA} />
              <span className="prf-slider" />
            </label>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} style={{ marginTop: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', marginBottom: '14px' }}>
              {lang === 'VI' ? 'Đổi mật khẩu' : 'Update Password'}
            </h3>
            <div className="prf-form-grid">
              <div className="prf-field">
                <label className="prf-field-label">
                  {lang === 'VI' ? 'Mật khẩu hiện tại' : 'Current Password'}
                </label>
                <input
                  type="password"
                  className="prf-input"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="prf-field">
                <label className="prf-field-label">
                  {lang === 'VI' ? 'Mật khẩu mới' : 'New Password'}
                </label>
                <input
                  type="password"
                  className="prf-input"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="••••••••"
                />
                {newPass && (
                  <div className="prf-strength-meter">
                    <div className="prf-strength-bars">
                      <div
                        className={`prf-strength-segment ${
                          passStrength.score >= 1 ? 'active-weak' : ''
                        }`}
                      />
                      <div
                        className={`prf-strength-segment ${
                          passStrength.score >= 2 ? 'active-med' : ''
                        }`}
                      />
                      <div
                        className={`prf-strength-segment ${
                          passStrength.score >= 3 ? 'active-good' : ''
                        }`}
                      />
                      <div
                        className={`prf-strength-segment ${
                          passStrength.score >= 4 ? 'active-strong' : ''
                        }`}
                      />
                    </div>
                    <span className="prf-strength-label">{passStrength.label}</span>
                  </div>
                )}
              </div>

              <div className="prf-field prf-field--full">
                <label className="prf-field-label">
                  {lang === 'VI' ? 'Xác nhận mật khẩu mới' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  className="prf-input"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="prf-input-action-btn"
                style={{ position: 'static', height: '40px', padding: '0 24px', fontSize: '13px' }}
                disabled={updatingPass}
              >
                {updatingPass
                  ? (lang === 'VI' ? 'Đang cập nhật...' : 'Updating...')
                  : (lang === 'VI' ? 'Cập nhật mật khẩu' : 'Update Password')}
              </button>
            </div>
          </form>
        </section>

        {/* ── 4. Preferences & Notifications ── */}
        <section className="prf-glass-card">
          <div className="prf-section-title-row">
            <span className="material-symbols-outlined prf-section-icon prf-section-icon--pref">tune</span>
            <h2 className="prf-section-title">
              {lang === 'VI' ? 'Tùy chọn & Thông báo' : 'Preferences & Notifications'}
            </h2>
          </div>

          <div className="prf-security-item">
            <div className="prf-security-left">
              <div className="prf-security-icon-box" style={{ background: 'rgba(34, 211, 238, 0.12)', color: '#22d3ee' }}>
                <span className="material-symbols-outlined text-[20px]">language</span>
              </div>
              <div className="prf-security-meta">
                <h4>{lang === 'VI' ? 'Ngôn ngữ giao diện' : 'Display Language'}</h4>
                <p>{lang === 'VI' ? 'Chọn ngôn ngữ hiển thị trên hệ thống SpotWay' : 'Choose your preferred language'}</p>
              </div>
            </div>
            <div className="prf-segmented-lang">
              <button
                type="button"
                className={`prf-seg-btn ${lang === 'EN' ? 'prf-seg-btn--active' : ''}`}
                onClick={() => setLang('EN')}
              >
                English
              </button>
              <button
                type="button"
                className={`prf-seg-btn ${lang === 'VI' ? 'prf-seg-btn--active' : ''}`}
                onClick={() => setLang('VI')}
              >
                Tiếng Việt
              </button>
            </div>
          </div>

          <div className="prf-security-item" style={{ marginBottom: 0 }}>
            <div className="prf-security-left">
              <div className="prf-security-icon-box" style={{ background: 'rgba(248, 172, 255, 0.12)', color: '#f8acff' }}>
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <div className="prf-security-meta">
                <h4>{lang === 'VI' ? 'Thông báo qua Email' : 'Email Notifications'}</h4>
                <p>{lang === 'VI' ? 'Nhận thư mời tham gia workspace, tin cập nhật hệ thống và cảnh báo bảo mật' : 'Receive invitations, system updates and security alerts'}</p>
              </div>
            </div>
            <label className="prf-switch">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={() => setEmailNotifications((prev) => !prev)}
              />
              <span className="prf-slider" />
            </label>
          </div>
        </section>

        {/* ── 5. Danger Zone / Logout ── */}
        <section className="prf-glass-card prf-danger-card">
          <div className="prf-section-title-row" style={{ borderColor: 'rgba(255, 180, 171, 0.2)' }}>
            <span className="material-symbols-outlined prf-section-icon" style={{ color: '#ffb4ab' }}>power_settings_new</span>
            <h2 className="prf-section-title" style={{ color: '#ffdad6' }}>
              {lang === 'VI' ? 'Quản lý phiên đăng nhập' : 'Session Management'}
            </h2>
          </div>

          <p style={{ fontSize: '13px', color: '#958ea0', marginBottom: '16px' }}>
            {lang === 'VI'
              ? 'Đăng xuất khỏi thiết bị này sẽ xóa token xác thực và đưa bạn về màn hình đăng nhập.'
              : 'Signing out will clear local authentication tokens and return to the login screen.'}
          </p>

          <button type="button" className="prf-btn-danger" onClick={handleLogout}>
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>{lang === 'VI' ? 'Đăng xuất khỏi thiết bị' : 'Sign out of device'}</span>
          </button>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="ah-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="ah-footer-inner">
          <div className="ah-footer-brand">
            <strong>SpotWay</strong>
            <span>© 2026 SpotWay Spatial OS Inc. All rights reserved.</span>
          </div>
          <div className="ah-footer-links">
            <Link to="/guest" className="ah-footer-link">3D Mapping Engine</Link>
            <span className="ah-footer-link">Privacy Policy</span>
            <span className="ah-footer-link">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ProfilePage

