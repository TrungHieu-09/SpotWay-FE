import { useState, useEffect } from 'react'
import { App as AntApp } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore, roleLabel } from '../../auth/store'
import { SpotWayNavbar } from '../../components/layout/SpotWayNavbar'
import type { Role } from '../../types/auth'
import './ProfilePage.css'

export interface ProfilePageProps {
  embedded?: boolean
}

function getWorkspacePath(role?: Role): { path: string; labelVi: string; labelEn: string } {
  switch (role) {
    case 'admin':
      return { path: '/admin', labelVi: 'Bảng điều khiển Admin', labelEn: 'Admin Console' }
    case 'building_owner':
      return { path: '/owner/dashboard', labelVi: 'Quản trị Tòa nhà', labelEn: 'Owner Dashboard' }
    case 'building_manager':
      return { path: '/manager', labelVi: 'Không gian 2D & Khu vực', labelEn: 'Manager Workspace' }
    case 'store_owner':
      return { path: '/store/profile', labelVi: 'Quản lý Gian hàng', labelEn: 'Storefront Console' }
    default:
      return { path: '/account', labelVi: 'Trung tâm Tài khoản', labelEn: 'Workspace Hub' }
  }
}

export function ProfilePage({ embedded = false }: ProfilePageProps) {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const changePassword = useAuthStore((state) => state.changePassword)

  // Language state
  const [lang, setLang] = useState<'VI' | 'EN'>('VI')

  // Profile display name
  const [displayName, setDisplayName] = useState(
    user?.name || (user?.email ? user.email.split('@')[0] : 'User'),
  )
  const [nameInput, setNameInput] = useState(displayName)
  const [savingName, setSavingName] = useState(false)
  const [nameBanner, setNameBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  // Security & Password form
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [updatingPass, setUpdatingPass] = useState(false)
  const [passBanner, setPassBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

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
  const workspaceLink = getWorkspacePath(user?.role)

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

  // Generate strong password helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let generated = 'Sw!'
    for (let i = 0; i < 9; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPass(generated)
    setConfirmPass(generated)
    setShowNewPass(true)
    setShowConfirmPass(true)
    setPassBanner(null)
  }

  // Handle Save Display Name
  const handleSaveName = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setNameBanner(null)
    const trimmed = nameInput.trim()
    if (trimmed.length < 2) {
      const msg =
        lang === 'VI'
          ? 'Tên hiển thị phải có tối thiểu 2 ký tự.'
          : 'Display name must be at least 2 characters.'
      setNameBanner({ type: 'error', text: msg })
      message.error(msg)
      return
    }

    setSavingName(true)
    try {
      const updated = await updateProfile(trimmed)
      setDisplayName(updated.name || trimmed)
      const successMsg =
        lang === 'VI'
          ? `Đã đổi tên hiển thị thành "${updated.name || trimmed}" thành công!`
          : `Display name updated to "${updated.name || trimmed}"!`
      setNameBanner({ type: 'success', text: successMsg })
      message.success(successMsg)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : lang === 'VI'
            ? 'Không thể cập nhật tên hiển thị'
            : 'Failed to update display name'
      setNameBanner({ type: 'error', text: msg })
      message.error(msg)
    } finally {
      setSavingName(false)
    }
  }

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassBanner(null)

    if (!currentPass) {
      const msg =
        lang === 'VI'
          ? 'Vui lòng nhập mật khẩu hiện tại của bạn.'
          : 'Please enter your current password.'
      setPassBanner({ type: 'error', text: msg })
      message.error(msg)
      return
    }
    if (newPass.length < 8) {
      const msg =
        lang === 'VI'
          ? 'Mật khẩu mới phải có tối thiểu 8 ký tự.'
          : 'New password must be at least 8 characters.'
      setPassBanner({ type: 'error', text: msg })
      message.error(msg)
      return
    }
    if (newPass !== confirmPass) {
      const msg =
        lang === 'VI'
          ? 'Xác nhận mật khẩu mới không khớp.'
          : 'Password confirmation does not match.'
      setPassBanner({ type: 'error', text: msg })
      message.error(msg)
      return
    }

    setUpdatingPass(true)
    try {
      await changePassword(currentPass, newPass)
      const successMsg =
        lang === 'VI'
          ? 'Mật khẩu đã được thay đổi thành công! Bạn có thể dùng mật khẩu mới cho lần đăng nhập tiếp theo.'
          : 'Password updated successfully!'
      setPassBanner({ type: 'success', text: successMsg })
      message.success(successMsg)
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : lang === 'VI'
            ? 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.'
            : 'Failed to update password. Please verify your current password.'
      setPassBanner({ type: 'error', text: msg })
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
        ? lang === 'VI'
          ? 'Đã kích hoạt xác thực 2 lớp qua email.'
          : 'Two-factor authentication enabled via email.'
        : lang === 'VI'
          ? 'Đã tắt xác thực 2 lớp.'
          : 'Two-factor authentication disabled.',
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
    <div className={`prf-root ${embedded ? 'prf-root--embedded' : ''}`}>
      {/* ── Top Bar (only when standalone) ── */}
      {!embedded && (
        <SpotWayNavbar
          activeTab="account"
          lang={lang}
          onLanguageChange={setLang}
        />
      )}

      <main className={`prf-container ${embedded ? 'prf-container--embedded' : ''}`}>
        {/* ── HUD Telemetry Line ── */}
        <div className="prf-hud-bar">
          <div className="prf-hud-left">
            <span className="prf-hud-dot" />
            <span>IDENTITY &amp; SECURITY HUB // {userRoleText.toUpperCase()}</span>
          </div>
          <div className="prf-hud-right">
            <span>
              ID: <strong className="prf-hud-tag">{userIdTag}</strong>
            </span>
            <span>
              STATUS: <strong className="prf-hud-tag">ACTIVE</strong>
            </span>
          </div>
        </div>

        {/* ── 1. Profile Header Hero Glass Card ── */}
        <section className="prf-glass-card prf-glass-card--hero">
          <div className="prf-header-hero">
            <div className="prf-header-user">
              <div className="prf-avatar-big">{userInitial}</div>
              <div className="prf-user-details">
                <div className="prf-name-row">
                  <h1 className="prf-user-name">{displayName}</h1>
                  <span className="prf-badge-role">{userRoleText}</span>
                  <span className="prf-badge-verified">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    {lang === 'VI' ? 'Đã xác thực' : 'Verified'}
                  </span>
                </div>
                <p className="prf-user-email">{userEmail}</p>
                <div className="prf-user-id-row">
                  <span>
                    Mã định danh: <code className="prf-id-chip">{userIdTag}</code>
                  </span>
                  {user?.tenant?.name && (
                    <>
                      <span>•</span>
                      <span>
                        Tổ chức: <strong style={{ color: '#5de6ff' }}>{user.tenant.name}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="prf-header-actions">
              {!embedded && (
                <Link to={workspaceLink.path} className="prf-btn-ghost">
                  <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
                  <span>{lang === 'VI' ? workspaceLink.labelVi : workspaceLink.labelEn}</span>
                </Link>
              )}
              <Link to="/account" className="prf-btn-ghost" title="Trung tâm tài khoản">
                <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
                <span>{lang === 'VI' ? 'Trung tâm Tài khoản' : 'Workspace Hub'}</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 2. Personal Information Card (Change Display Name) ── */}
        <section className="prf-glass-card">
          <div className="prf-section-title-row">
            <div className="prf-section-icon-wrap prf-section-icon-wrap--cyan">
              <span className="material-symbols-outlined prf-section-icon">badge</span>
            </div>
            <div>
              <h2 className="prf-section-title">
                {lang === 'VI' ? 'Thông tin cá nhân & Tên hiển thị' : 'Personal Information'}
              </h2>
              <p className="prf-section-subtitle">
                {lang === 'VI'
                  ? 'Tùy chỉnh tên hiển thị của bạn trên thanh điều hướng, bảng quản trị và nhật ký hoạt động.'
                  : 'Customize how your name appears across navigation bars and workspace logs.'}
              </p>
            </div>
          </div>

          {nameBanner && (
            <div className={`prf-alert prf-alert--${nameBanner.type}`}>
              <span className="material-symbols-outlined text-[18px]">
                {nameBanner.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{nameBanner.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveName} className="prf-form-grid">
            <div className="prf-field">
              <label className="prf-field-label">
                {lang === 'VI' ? 'Tên hiển thị của bạn' : 'Display Name'}
              </label>
              <div className="prf-input-wrapper">
                <input
                  type="text"
                  className="prf-input prf-input--with-btn"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value)
                    if (nameBanner) setNameBanner(null)
                  }}
                  placeholder={lang === 'VI' ? 'Nhập tên hiển thị mới...' : 'Enter display name...'}
                  maxLength={80}
                />
                <button
                  type="submit"
                  className="prf-input-action-btn"
                  disabled={savingName || nameInput.trim() === displayName}
                >
                  {savingName
                    ? lang === 'VI'
                      ? 'Đang lưu...'
                      : 'Saving...'
                    : lang === 'VI'
                      ? 'Lưu tên mới'
                      : 'Save Name'}
                </button>
              </div>
              <p className="prf-field-hint">
                {lang === 'VI'
                  ? 'Bạn có thể đổi tên bất kỳ lúc nào (từ 2 đến 80 ký tự).'
                  : 'You can change your display name anytime (2–80 characters).'}
              </p>
            </div>

            <div className="prf-field">
              <label className="prf-field-label">
                {lang === 'VI' ? 'Địa chỉ Email đăng nhập' : 'Login Email Address'}
              </label>
              <div className="prf-input-wrapper">
                <input type="email" className="prf-input" value={userEmail} disabled />
              </div>
              <p className="prf-field-hint">
                {lang === 'VI'
                  ? `Vai trò hiện tại: ${userRoleText}. Email là định danh cố định của tài khoản.`
                  : `Current role: ${userRoleText}. Email is your permanent login identifier.`}
              </p>
            </div>
          </form>
        </section>

        {/* ── 3. Security & Password Card (Change Password) ── */}
        <section className="prf-glass-card">
          <div className="prf-section-title-row">
            <div className="prf-section-icon-wrap prf-section-icon-wrap--violet">
              <span className="material-symbols-outlined prf-section-icon prf-section-icon--security">
                lock_reset
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="prf-section-title">
                {lang === 'VI' ? 'Đổi mật khẩu & Bảo mật tài khoản' : 'Password & Account Security'}
              </h2>
              <p className="prf-section-subtitle">
                {lang === 'VI'
                  ? 'Thiết lập mật khẩu mới theo ý bạn (tối thiểu 8 ký tự) để bảo vệ quyền truy cập.'
                  : 'Update your account password (minimum 8 characters) to keep your workspace secure.'}
              </p>
            </div>
            <button
              type="button"
              className="prf-btn-suggest"
              onClick={handleGeneratePassword}
              title="Tạo mật khẩu ngẫu nhiên an toàn"
            >
              <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
              <span>{lang === 'VI' ? 'Gợi ý mật khẩu mạnh' : 'Suggest Strong Password'}</span>
            </button>
          </div>

          {passBanner && (
            <div className={`prf-alert prf-alert--${passBanner.type}`}>
              <span className="material-symbols-outlined text-[18px]">
                {passBanner.type === 'success' ? 'check_circle' : 'warning'}
              </span>
              <span>{passBanner.text}</span>
            </div>
          )}

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword}>
            <div className="prf-form-grid">
              {/* Current Password */}
              <div className="prf-field prf-field--full">
                <label className="prf-field-label">
                  {lang === 'VI' ? 'Mật khẩu hiện tại *' : 'Current Password *'}
                </label>
                <div className="prf-input-wrapper">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="prf-input prf-input--with-icon"
                    value={currentPass}
                    onChange={(e) => {
                      setCurrentPass(e.target.value)
                      if (passBanner) setPassBanner(null)
                    }}
                    placeholder={
                      lang === 'VI' ? 'Nhập mật khẩu đang sử dụng...' : 'Enter current password...'
                    }
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="prf-eye-btn"
                    onClick={() => setShowCurrentPass((v) => !v)}
                    tabIndex={-1}
                    title={showCurrentPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showCurrentPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="prf-field">
                <label className="prf-field-label">
                  {lang === 'VI' ? 'Mật khẩu mới (Tối thiểu 8 ký tự) *' : 'New Password (Min 8 chars) *'}
                </label>
                <div className="prf-input-wrapper">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="prf-input prf-input--with-icon"
                    value={newPass}
                    onChange={(e) => {
                      setNewPass(e.target.value)
                      if (passBanner) setPassBanner(null)
                    }}
                    placeholder={lang === 'VI' ? 'Nhập mật khẩu mới...' : 'Enter new password...'}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="prf-eye-btn"
                    onClick={() => setShowNewPass((v) => !v)}
                    tabIndex={-1}
                    title={showNewPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showNewPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>

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
                    <span className="prf-strength-label">
                      {lang === 'VI' ? 'Độ mạnh: ' : 'Strength: '}
                      <strong>{passStrength.label}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="prf-field">
                <div className="prf-label-between">
                  <label className="prf-field-label">
                    {lang === 'VI' ? 'Nhập lại mật khẩu mới *' : 'Confirm New Password *'}
                  </label>
                  {confirmPass.length > 0 && (
                    <span
                      className={`prf-match-pill ${
                        confirmPass === newPass ? 'prf-match-pill--ok' : 'prf-match-pill--err'
                      }`}
                    >
                      {confirmPass === newPass
                        ? lang === 'VI'
                          ? '✓ Khớp mật khẩu'
                          : '✓ Matches'
                        : lang === 'VI'
                          ? '✕ Chưa khớp'
                          : '✕ Does not match'}
                    </span>
                  )}
                </div>
                <div className="prf-input-wrapper">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    className="prf-input prf-input--with-icon"
                    value={confirmPass}
                    onChange={(e) => {
                      setConfirmPass(e.target.value)
                      if (passBanner) setPassBanner(null)
                    }}
                    placeholder={
                      lang === 'VI' ? 'Nhập lại mật khẩu mới...' : 'Re-enter new password...'
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="prf-eye-btn"
                    onClick={() => setShowConfirmPass((v) => !v)}
                    tabIndex={-1}
                    title={showConfirmPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showConfirmPass ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="prf-pass-actions">
              <button
                type="submit"
                className="prf-btn-primary"
                disabled={updatingPass}
              >
                <span className="material-symbols-outlined text-[18px]">key</span>
                <span>
                  {updatingPass
                    ? lang === 'VI'
                      ? 'Đang cập nhật mật khẩu...'
                      : 'Updating password...'
                    : lang === 'VI'
                      ? 'Lưu mật khẩu mới'
                      : 'Update Password'}
                </span>
              </button>
            </div>
          </form>

          <div className="prf-divider" />

          {/* 2FA Toggle Row */}
          <div className="prf-security-item" style={{ marginBottom: 0 }}>
            <div className="prf-security-left">
              <div className="prf-security-icon-box">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div className="prf-security-meta">
                <h4>
                  {lang === 'VI' ? 'Xác thực hai lớp (2FA)' : 'Two-Factor Authentication (2FA)'}
                </h4>
                <p>
                  {twoFactorAuth
                    ? lang === 'VI'
                      ? 'Đang kích hoạt — Mã OTP được gửi qua email khi đăng nhập trên thiết bị lạ.'
                      : 'Active — OTP sent via email upon unknown logins.'
                    : lang === 'VI'
                      ? 'Chưa bật — Khuyến nghị bật để tăng cường an toàn cho tài khoản.'
                      : 'Disabled — Recommended to prevent unauthorized access.'}
                </p>
              </div>
            </div>
            <label className="prf-switch">
              <input type="checkbox" checked={twoFactorAuth} onChange={handleToggle2FA} />
              <span className="prf-slider" />
            </label>
          </div>
        </section>

        {/* ── 4. Preferences & Notifications ── */}
        <section className="prf-glass-card">
          <div className="prf-section-title-row">
            <div className="prf-section-icon-wrap prf-section-icon-wrap--fuchsia">
              <span className="material-symbols-outlined prf-section-icon prf-section-icon--pref">
                tune
              </span>
            </div>
            <div>
              <h2 className="prf-section-title">
                {lang === 'VI' ? 'Tùy chọn & Thông báo' : 'Preferences & Notifications'}
              </h2>
              <p className="prf-section-subtitle">
                {lang === 'VI'
                  ? 'Cá nhân hóa ngôn ngữ hiển thị và thông báo hệ thống.'
                  : 'Personalize interface language and system alert delivery.'}
              </p>
            </div>
          </div>

          <div className="prf-security-item">
            <div className="prf-security-left">
              <div
                className="prf-security-icon-box"
                style={{ background: 'rgba(34, 211, 238, 0.12)', color: '#22d3ee' }}
              >
                <span className="material-symbols-outlined text-[20px]">language</span>
              </div>
              <div className="prf-security-meta">
                <h4>{lang === 'VI' ? 'Ngôn ngữ giao diện' : 'Display Language'}</h4>
                <p>
                  {lang === 'VI'
                    ? 'Chọn ngôn ngữ hiển thị trên hệ thống SpotWay'
                    : 'Choose your preferred language'}
                </p>
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
              <div
                className="prf-security-icon-box"
                style={{ background: 'rgba(248, 172, 255, 0.12)', color: '#f8acff' }}
              >
                <span className="material-symbols-outlined text-[20px]">mail</span>
              </div>
              <div className="prf-security-meta">
                <h4>{lang === 'VI' ? 'Thông báo qua Email' : 'Email Notifications'}</h4>
                <p>
                  {lang === 'VI'
                    ? 'Nhận thư mời tham gia workspace, tin cập nhật hệ thống và cảnh báo bảo mật'
                    : 'Receive invitations, system updates and security alerts'}
                </p>
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

        {/* ── 5. Session Management / Logout ── */}
        <section className="prf-glass-card prf-danger-card">
          <div
            className="prf-section-title-row"
            style={{ borderColor: 'rgba(255, 180, 171, 0.2)' }}
          >
            <span
              className="material-symbols-outlined prf-section-icon"
              style={{ color: '#ffb4ab' }}
            >
              power_settings_new
            </span>
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

      {/* ── Footer (only when standalone) ── */}
      {!embedded && (
        <footer className="ah-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="ah-footer-inner">
            <div className="ah-footer-brand">
              <strong>SpotWay</strong>
              <span>© 2026 SpotWay Spatial OS Inc. All rights reserved.</span>
            </div>
            <div className="ah-footer-links">
              <Link to="/guest" className="ah-footer-link">
                3D Mapping Engine
              </Link>
              <span className="ah-footer-link">Privacy Policy</span>
              <span className="ah-footer-link">Terms of Service</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

export default ProfilePage
