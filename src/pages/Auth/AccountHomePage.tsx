import { useState } from 'react'
import { App as AntApp } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import { SpotWayNavbar } from '../../components/layout/SpotWayNavbar'
import './AccountHomePage.css'

interface PendingInvite {
  id: string
  orgName: string
  icon: string
  iconColor: 'cyan' | 'tertiary'
  roleAssigned: string
  inviterName: string
  expiresIn: string
}

const INITIAL_INVITES: PendingInvite[] = [
  {
    id: 'inv-1',
    orgName: 'Metro Transit Authority',
    icon: 'subway',
    iconColor: 'cyan',
    roleAssigned: 'Building Manager',
    inviterName: 'Tran Minh',
    expiresIn: 'Hết hạn sau 2 ngày',
  },
  {
    id: 'inv-2',
    orgName: 'Skyline International Terminal',
    icon: 'flight_takeoff',
    iconColor: 'tertiary',
    roleAssigned: 'Wayfinding Specialist',
    inviterName: 'Sarah Chen',
    expiresIn: 'Hết hạn sau 5 ngày',
  },
]

export function AccountHomePage() {
  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const changePassword = useAuthStore((state) => state.changePassword)

  // Profile display name
  const [displayName, setDisplayName] = useState(
    user?.name || user?.email?.split('@')[0] || 'Elena Rostova',
  )
  const [nameInput, setNameInput] = useState(displayName)

  // Language & preferences
  const [lang, setLang] = useState<'VI' | 'EN'>('VI')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [twoFactorAuth, setTwoFactorAuth] = useState(false)

  // Pending invitations state
  const [invites, setInvites] = useState<PendingInvite[]>(INITIAL_INVITES)
  const [isSimulatedEmpty, setIsSimulatedEmpty] = useState(false)

  // Modals state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  // Password modal form
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [updatingPass, setUpdatingPass] = useState(false)

  // Invite modal input
  const [inviteLink, setInviteLink] = useState('')
  const [submittingInvite, setSubmittingInvite] = useState(false)

  // Unique user ID tag
  const userIdTag = user?.id ? `usr_${user.id.slice(0, 8)}` : 'usr_82914fc9'
  const userEmail = user?.email || 'elena@metro.com'
  const userInitial = displayName.charAt(0).toUpperCase()

  // Calculate password strength (0-4)
  const getPassStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Chưa nhập' }
    let s = 0
    if (pass.length >= 8) s++
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) s++
    if (/\d/.test(pass)) s++
    if (/[^A-Za-z0-9]/.test(pass)) s++
    const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh (3/4)', 'Rất mạnh (4/4)']
    return { score: s, label: labels[s] }
  }

  const passStrength = getPassStrength(newPass)

  // Handlers
  const handleSaveName = () => {
    if (!nameInput.trim()) {
      message.error(lang === 'VI' ? 'Tên hiển thị không được để trống.' : 'Display name cannot be empty.')
      return
    }
    setDisplayName(nameInput.trim())
    try {
      const stored = window.localStorage.getItem('spotway.user')
      if (stored) {
        const parsed = JSON.parse(stored)
        parsed.name = nameInput.trim()
        window.localStorage.setItem('spotway.user', JSON.stringify(parsed))
      }
    } catch {
      // ignore
    }
    message.success(lang === 'VI' ? 'Đã lưu tên hiển thị thành công!' : 'Display name updated successfully!')
  }

  const handleAcceptInvite = (inv: PendingInvite) => {
    message.success(
      lang === 'VI'
        ? `Đã chấp nhận lời mời từ "${inv.orgName}"! Đang tải workspace...`
        : `Accepted invitation from "${inv.orgName}"! Loading workspace...`,
    )
    setInvites((prev) => prev.filter((item) => item.id !== inv.id))
    setTimeout(() => {
      navigate('/owner/dashboard', { replace: true })
    }, 900)
  }

  const handleDeclineInvite = (id: string) => {
    setInvites((prev) => prev.filter((item) => item.id !== id))
    message.info(lang === 'VI' ? 'Đã từ chối lời mời.' : 'Declined invitation.')
  }

  const handleToggleEmptySimulation = () => {
    setIsSimulatedEmpty((prev) => !prev)
  }

  const handleJoinByLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteLink.trim()) {
      message.warning(lang === 'VI' ? 'Vui lòng nhập link hoặc mã mời.' : 'Please enter an invitation link or code.')
      return
    }
    setSubmittingInvite(true)
    setTimeout(() => {
      setSubmittingInvite(false)
      const clean = inviteLink.trim()
      const newInv: PendingInvite = {
        id: `inv-${Date.now()}`,
        orgName: clean.toLowerCase().includes('metro')
          ? 'Metro Transit Authority'
          : 'Tổ hợp Saigon Innovation Plaza',
        icon: 'apartment',
        iconColor: 'cyan',
        roleAssigned: 'Building Manager',
        inviterName: 'Ban Quản Trị Tòa Nhà',
        expiresIn: 'Vừa thêm',
      }
      setInvites((prev) => [newInv, ...prev])
      setIsSimulatedEmpty(false)
      setIsInviteModalOpen(false)
      setInviteLink('')
      message.success(
        lang === 'VI'
          ? `Đã tìm thấy lời mời từ "${newInv.orgName}"!`
          : `Found invitation from "${newInv.orgName}"!`,
      )
    }, 600)
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPass || newPass.length < 8) {
      message.error(
        lang === 'VI' ? 'Mật khẩu mới phải có tối thiểu 8 ký tự.' : 'New password must be at least 8 characters.',
      )
      return
    }
    if (newPass !== confirmPass) {
      message.error(lang === 'VI' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.')
      return
    }

    setUpdatingPass(true)
    try {
      await changePassword(currentPass || undefined, newPass)
      message.success(lang === 'VI' ? 'Đổi mật khẩu thành công!' : 'Password updated successfully!')
      setIsPasswordModalOpen(false)
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể đổi mật khẩu'
      message.error(msg)
    } finally {
      setUpdatingPass(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const activeInvites = isSimulatedEmpty ? [] : invites

  return (
    <div className="ah-page-root">
      {/* ── 1. UNIFIED SPOTWAY NAVBAR (Identical to Pricing with ping dot & brand) ── */}
      <SpotWayNavbar
        activeTab="account"
        lang={lang}
        onLanguageChange={(newLang) => setLang(newLang)}
      />

      {/* ── 2. MAIN VIEWPORT ── */}
      <main className="ah-main-viewport">
        {/* HUD Ticker / Coordinate Breadcrumb */}
        <div className="ah-hud-ticker">
          <div className="ah-hud-ticker__left">
            <span className="ah-hud-pulse-dot" />
            <span>ACCOUNT ENVIRONMENT</span>
            <span className="ah-hud-sep">/</span>
            <span className="ah-hud-node">NODE-00 // STANDALONE USER</span>
          </div>
          <div className="ah-hud-ticker__right">
            <span>LAT: 37.7749° N</span>
            <span>LON: 122.4194° W</span>
            <span className="ah-hud-radar">RADAR ACTIVE</span>
          </div>
        </div>

        {/* ── 2-COLUMN GRID (approx 62% Left / 38% Right) ── */}
        <div className="ah-dashboard-grid">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Hero Workspace Card, Invites, Guest Perks    */}
          {/* ========================================================= */}
          <div className="ah-col-main">
            {/* 1. HERO GLASS CARD */}
            <section className="ah-glass-card ah-hero-card">
              {/* Internal Aura Glows */}
              <div className="ah-hero-glow ah-hero-glow--top" />
              <div className="ah-hero-glow ah-hero-glow--bottom" />

              <div className="ah-hero-content">
                {/* Left Text & Actions */}
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
                      ? 'Bạn chưa thuộc workspace nào. Hãy tạo workspace cho tổ chức của bạn, hoặc tham gia bằng liên kết mời.'
                      : "You're not in a workspace yet. Create one for your organization, or join with an invitation."}
                  </p>

                  <div className="ah-hero-actions">
                    <button
                      type="button"
                      className="ah-btn-glow"
                      onClick={() => navigate('/onboarding')}
                    >
                      <span className="material-symbols-outlined text-[20px]">add</span>
                      <span>{lang === 'VI' ? 'Tạo workspace mới' : 'Create a workspace'}</span>
                    </button>

                    <button
                      type="button"
                      className="ah-btn-outline"
                      onClick={() => setIsInviteModalOpen(true)}
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#22d3ee]">link</span>
                      <span>{lang === 'VI' ? 'Nhập link mời' : 'Enter invitation link'}</span>
                    </button>
                  </div>
                </div>

                {/* Right: Isometric 3D Floor-Plate HUD Simulation */}
                <div className="ah-iso-wrapper">
                  <div className="ah-iso-cube">
                    {/* Inner sub-quadrants grid */}
                    <div className="ah-iso-quadrants">
                      <div className="ah-iso-cell ah-iso-cell--border-rb" />
                      <div className="ah-iso-cell ah-iso-cell--border-b" />
                      <div className="ah-iso-cell ah-iso-cell--border-r" />
                      <div className="ah-iso-cell" />
                    </div>

                    {/* Waypoint Node A with Pulse Ping */}
                    <div className="ah-iso-node-a-ping" />
                    <div className="ah-iso-node-a" />

                    {/* Projected Vertical Beacon Line */}
                    <div className="ah-iso-beacon-line" />

                    {/* Waypoint Node B */}
                    <div className="ah-iso-node-b" />

                    {/* Digital Coordinate Tag HUD */}
                    <span className="ah-iso-hud-tag">Z: +14.2m</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. PENDING INVITATIONS GLASS CARD */}
            <section className="ah-glass-card ah-invites-card">
              <div className="ah-card-header-row">
                <div className="ah-card-title-group">
                  <h2 className="ah-card-title">
                    {lang === 'VI' ? 'Lời mời tham gia' : 'Pending invitations'}
                  </h2>
                  <span className={`ah-badge-count ${activeInvites.length === 0 ? 'ah-badge-count--empty' : ''}`}>
                    {activeInvites.length}
                  </span>
                </div>

                {/* Interactive Simulation Toggle */}
                <button
                  type="button"
                  className="ah-btn-toggle-sim"
                  onClick={handleToggleEmptySimulation}
                  title="Chuyển đổi thử trạng thái có lời mời hoặc 0 lời mời"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  <span>{isSimulatedEmpty ? 'Hiển thị lời mời (2)' : 'Mô phỏng 0 lời mời'}</span>
                </button>
              </div>

              {/* State A: Active Invitations List */}
              {activeInvites.length > 0 ? (
                <div className="ah-invites-list">
                  {activeInvites.map((inv) => (
                    <div key={inv.id} className="ah-invite-row">
                      <div className="ah-invite-info">
                        <div
                          className={`ah-invite-icon-box ${
                            inv.iconColor === 'tertiary'
                              ? 'ah-invite-icon-box--purple'
                              : 'ah-invite-icon-box--cyan'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[22px]">{inv.icon}</span>
                        </div>
                        <div>
                          <div className="ah-invite-title-row">
                            <h3 className="ah-invite-org">{inv.orgName}</h3>
                            <span className="ah-invite-role-tag">{inv.roleAssigned}</span>
                          </div>
                          <p className="ah-invite-by">
                            {lang === 'VI' ? 'Được mời bởi' : 'Invited by'}{' '}
                            <span className="text-white font-medium">{inv.inviterName}</span>{' '}
                            {lang === 'VI' ? 'với vai trò' : 'as'}{' '}
                            <span className="text-[#22d3ee]">{inv.roleAssigned}</span>
                          </p>
                          <p className="ah-invite-exp">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            <span>{inv.expiresIn}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="ah-invite-actions">
                        <button
                          type="button"
                          className="ah-btn-decline"
                          onClick={() => handleDeclineInvite(inv.id)}
                        >
                          {lang === 'VI' ? 'Từ chối' : 'Decline'}
                        </button>
                        <button
                          type="button"
                          className="ah-btn-accept"
                          onClick={() => handleAcceptInvite(inv)}
                        >
                          {lang === 'VI' ? 'Chấp nhận' : 'Accept'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* State B: Empty State */
                <div className="ah-invites-empty-box">
                  <div className="ah-empty-envelope-icon">
                    <span className="material-symbols-outlined text-[26px]">mark_email_unread</span>
                  </div>
                  <h4 className="ah-empty-envelope-title">
                    {lang === 'VI' ? 'Không có lời mời nào đang chờ' : 'No pending invitations'}
                  </h4>
                  <p className="ah-empty-envelope-desc">
                    {lang === 'VI'
                      ? 'Kiểm tra hòm thư của bạn để lấy liên kết mời, hoặc yêu cầu ban quản trị tổ hợp cấp quyền truy cập.'
                      : 'Check your email for invite links, or request access from your facility administrator.'}
                  </p>
                </div>
              )}
            </section>

            {/* 3. EXPLORE AS A GUEST & SAVED PLACES */}
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
                  <span>{lang === 'VI' ? 'Mở bản đồ Demo' : 'Open map'}</span>
                </button>
              </div>

              {/* Saved Places Sub-section */}
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
                  {/* Place 1 */}
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

                  {/* Place 2 */}
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

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Profile, Security, Preferences, Sign Out    */}
          {/* ========================================================= */}
          <div className="ah-col-side">
            {/* 1. PROFILE GLASS CARD */}
            <section className="ah-glass-card">
              <h2 className="ah-side-card-title">
                <span className="material-symbols-outlined text-[#22d3ee] text-[20px]">person</span>
                <span>{lang === 'VI' ? 'Hồ sơ cá nhân' : 'Profile'}</span>
              </h2>

              <div className="ah-profile-user-row">
                {/* User Avatar with Hover Edit Overlay */}
                <div
                  className="ah-profile-avatar-wrap"
                  onClick={() => message.info(lang === 'VI' ? 'Ảnh đại diện đồng bộ theo tài khoản' : 'Avatar synced')}
                >
                  <div className="ah-profile-avatar">{userInitial}</div>
                  <div className="ah-profile-avatar-overlay">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="ah-profile-name">{displayName}</h3>
                    <span className="ah-badge-verified">
                      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check
                      </span>
                      <span>Verified</span>
                    </span>
                  </div>
                  <p className="ah-profile-email">{userEmail}</p>
                  <span className="ah-profile-id">ID: {userIdTag}</span>
                </div>
              </div>

              {/* Inline Edit Display Name Field */}
              <div className="ah-profile-input-block">
                <label className="ah-mini-label">
                  {lang === 'VI' ? 'TÊN HIỂN THỊ' : 'DISPLAY NAME'}
                </label>
                <div className="ah-input-action-row">
                  <input
                    type="text"
                    className="ah-text-input"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Elena Rostova"
                  />
                  <button
                    type="button"
                    className="ah-btn-save-name"
                    onClick={handleSaveName}
                  >
                    {lang === 'VI' ? 'Lưu' : 'Save'}
                  </button>
                </div>
              </div>
            </section>

            {/* 2. SECURITY GLASS CARD */}
            <section className="ah-glass-card">
              <h2 className="ah-side-card-title">
                <span className="material-symbols-outlined text-[#22d3ee] text-[20px]">shield</span>
                <span>{lang === 'VI' ? 'Bảo mật' : 'Security'}</span>
              </h2>

              <div className="space-y-3.5">
                {/* Change Password Row (Triggers Modal) */}
                <button
                  type="button"
                  className="ah-security-row group"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  <div className="flex items-center gap-3">
                    <div className="ah-sec-icon-box">
                      <span className="material-symbols-outlined text-[20px]">key</span>
                    </div>
                    <div>
                      <h4 className="ah-sec-title">
                        {lang === 'VI' ? 'Đổi mật khẩu' : 'Change password'}
                      </h4>
                      <p className="ah-sec-sub">
                        {lang === 'VI' ? 'Đã cập nhật gần đây' : 'Last updated recently'}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined ah-sec-chevron">chevron_right</span>
                </button>

                {/* Two-Factor Authentication Row */}
                <div className="ah-security-row ah-security-row--static">
                  <div className="flex items-center gap-3">
                    <div className="ah-sec-icon-box">
                      <span className="material-symbols-outlined text-[20px]">verified_user</span>
                    </div>
                    <div>
                      <h4 className="ah-sec-title">
                        {lang === 'VI' ? 'Xác thực hai lớp (2FA)' : 'Two-factor authentication'}
                      </h4>
                      <p className="ah-sec-sub">
                        {twoFactorAuth
                          ? lang === 'VI' ? 'Đang bật' : 'Enabled'
                          : lang === 'VI' ? 'Đã tắt' : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label className="ah-switch">
                    <input
                      type="checkbox"
                      checked={twoFactorAuth}
                      onChange={(e) => {
                        setTwoFactorAuth(e.target.checked)
                        message.info(
                          e.target.checked
                            ? 'Đã kích hoạt 2FA tạm thời'
                            : 'Đã hủy kích hoạt 2FA',
                        )
                      }}
                    />
                    <span className="ah-slider" />
                  </label>
                </div>
              </div>
            </section>

            {/* 3. PREFERENCES GLASS CARD */}
            <section className="ah-glass-card">
              <h2 className="ah-side-card-title">
                <span className="material-symbols-outlined text-[#22d3ee] text-[20px]">tune</span>
                <span>{lang === 'VI' ? 'Tùy chọn' : 'Preferences'}</span>
              </h2>

              <div className="space-y-4">
                {/* Interface Language Segmented Control */}
                <div>
                  <label className="ah-mini-label">
                    {lang === 'VI' ? 'NGÔN NGỮ GIAO DIỆN' : 'INTERFACE LANGUAGE'}
                  </label>
                  <div className="ah-lang-segmented-grid">
                    <button
                      type="button"
                      className={`ah-seg-btn ${lang === 'EN' ? 'ah-seg-btn--active' : ''}`}
                      onClick={() => setLang('EN')}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      className={`ah-seg-btn ${lang === 'VI' ? 'ah-seg-btn--active' : ''}`}
                      onClick={() => setLang('VI')}
                    >
                      Tiếng Việt
                    </button>
                  </div>
                </div>

                {/* Email Notifications with Toggle */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="ah-sec-icon-box">
                      <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                    </div>
                    <div>
                      <h4 className="ah-sec-title">
                        {lang === 'VI' ? 'Thông báo qua Email' : 'Email notifications'}
                      </h4>
                      <p className="ah-sec-sub">
                        {lang === 'VI'
                          ? 'Lời mời, cảnh báo an toàn & báo cáo'
                          : 'Invites, safety alerts & reports'}
                      </p>
                    </div>
                  </div>

                  <label className="ah-switch">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                    <span className="ah-slider" />
                  </label>
                </div>
              </div>
            </section>

            {/* 4. SIGN OUT ACTION BUTTON */}
            <div>
              <button
                type="button"
                className="ah-btn-signout"
                onClick={handleLogout}
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span>{lang === 'VI' ? 'Đăng xuất tài khoản' : 'Sign out'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── 3. FOOTER ── */}
      <footer className="ah-footer">
        <div className="ah-footer-inner">
          <div className="flex items-center gap-3">
            <span className="ah-footer-brand">SpotWay</span>
            <span className="text-[#958ea0] text-xs">|</span>
            <span className="ah-footer-copy">
              © 2026 SpotWay Spatial OS Inc. All rights reserved.
            </span>
          </div>
          <div className="ah-footer-links">
            <Link to="/#features">3D Mapping Engine</Link>
            <Link to="/guest">Indoor Telemetry</Link>
            <Link to="/pricing">Pricing</Link>
            <a href="#privacy" onClick={(e) => { e.preventDefault(); message.info('SpotWay Privacy Policy'); }}>Privacy Policy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); message.info('SpotWay Terms of Service'); }}>Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* ── MODAL 1: CHANGE PASSWORD OVERLAY ── */}
      {isPasswordModalOpen && (
        <div className="ah-modal-backdrop" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="ah-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="ah-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="ah-modal-icon-badge">
                  <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                </div>
                <h3 className="ah-modal-heading">
                  {lang === 'VI' ? 'Đổi mật khẩu' : 'Change password'}
                </h3>
              </div>
              <button
                type="button"
                className="ah-modal-close-btn"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Password Form */}
            <form className="space-y-4" onSubmit={handleUpdatePassword}>
              <div>
                <label className="ah-mini-label">
                  {lang === 'VI' ? 'MẬT KHẨU HIỆN TẠI' : 'CURRENT PASSWORD'}
                </label>
                <input
                  type="password"
                  className="ah-modal-input"
                  placeholder="••••••••••••"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                />
              </div>

              <div>
                <label className="ah-mini-label">
                  {lang === 'VI' ? 'MẬT KHẨU MỚI' : 'NEW PASSWORD'}
                </label>
                <input
                  type="password"
                  className="ah-modal-input"
                  placeholder={lang === 'VI' ? 'Nhập mật khẩu mới' : 'Enter new password'}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />

                {/* 4-Segment Strength Meter */}
                {newPass && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-[#958ea0]">{lang === 'VI' ? 'Độ mạnh:' : 'Strength:'}</span>
                      <span className="text-[#22d3ee] font-semibold">{passStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      <div className={`rounded-full ${passStrength.score >= 1 ? 'bg-emerald-400' : 'bg-white/10'}`} />
                      <div className={`rounded-full ${passStrength.score >= 2 ? 'bg-emerald-400' : 'bg-white/10'}`} />
                      <div className={`rounded-full ${passStrength.score >= 3 ? 'bg-[#22d3ee]' : 'bg-white/10'}`} />
                      <div className={`rounded-full ${passStrength.score >= 4 ? 'bg-[#34d399]' : 'bg-white/10'}`} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="ah-mini-label">
                  {lang === 'VI' ? 'XÁC NHẬN MẬT KHẨU MỚI' : 'CONFIRM NEW PASSWORD'}
                </label>
                <input
                  type="password"
                  className="ah-modal-input"
                  placeholder={lang === 'VI' ? 'Nhập lại mật khẩu mới' : 'Repeat new password'}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                />
              </div>

              <div className="ah-modal-footer">
                <button
                  type="button"
                  className="ah-modal-btn-cancel"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  {lang === 'VI' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="ah-modal-btn-submit"
                  disabled={updatingPass}
                >
                  {updatingPass
                    ? lang === 'VI' ? 'Đang cập nhật...' : 'Updating...'
                    : lang === 'VI' ? 'Cập nhật mật khẩu' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ENTER INVITATION LINK OVERLAY ── */}
      {isInviteModalOpen && (
        <div className="ah-modal-backdrop" onClick={() => setIsInviteModalOpen(false)}>
          <div className="ah-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ah-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="ah-modal-icon-badge">
                  <span className="material-symbols-outlined text-[20px]">link</span>
                </div>
                <h3 className="ah-modal-heading">
                  {lang === 'VI' ? 'Nhập liên kết / Mã mời' : 'Enter invitation link'}
                </h3>
              </div>
              <button
                type="button"
                className="ah-modal-close-btn"
                onClick={() => setIsInviteModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <p className="text-[#cbc3d7] text-[13px] mb-4 leading-relaxed">
              {lang === 'VI'
                ? 'Dán link mời hoặc mã mời được gửi từ quản trị viên tổ hợp để tham gia workspace:'
                : 'Paste the invite link or code received from your facility administrator to join:'}
            </p>

            <form onSubmit={handleJoinByLink} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  className="ah-modal-input"
                  placeholder="https://spotway.app/join/spw-metro hoặc SPW-9921"
                  value={inviteLink}
                  onChange={(e) => setInviteLink(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="ah-modal-footer">
                <button
                  type="button"
                  className="ah-modal-btn-cancel"
                  onClick={() => setIsInviteModalOpen(false)}
                >
                  {lang === 'VI' ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="ah-modal-btn-submit"
                  disabled={submittingInvite}
                >
                  {submittingInvite
                    ? lang === 'VI' ? 'Đang tìm...' : 'Searching...'
                    : lang === 'VI' ? 'Xác nhận tham gia' : 'Join workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountHomePage
