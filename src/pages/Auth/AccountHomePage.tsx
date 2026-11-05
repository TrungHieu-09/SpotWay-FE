import { useState, useEffect } from 'react'
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

  const [lang, setLang] = useState<'VI' | 'EN'>('VI')

  // Display name (read-only here — editable in /profile)
  const [displayName, setDisplayName] = useState(
    user?.name || (user?.email ? user.email.split('@')[0] : 'User'),
  )

  // Pending invitations
  const [invites, setInvites] = useState<PendingInvite[]>(INITIAL_INVITES)
  const [isSimulatedEmpty, setIsSimulatedEmpty] = useState(false)

  // Invite link modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [submittingInvite, setSubmittingInvite] = useState(false)

  // Sync display name when user store updates
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || (user.email ? user.email.split('@')[0] : 'User'))
    }
  }, [user])

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

  const activeInvites = isSimulatedEmpty ? [] : invites

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

          {/* ── 2. PENDING INVITATIONS ── */}
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

              {/* Simulation Toggle */}
              <button
                type="button"
                className="ah-btn-toggle-sim"
                onClick={() => setIsSimulatedEmpty((prev) => !prev)}
                title="Chuyển đổi thử trạng thái có lời mời hoặc 0 lời mời"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                <span>{isSimulatedEmpty ? 'Hiển thị lời mời (2)' : 'Mô phỏng 0 lời mời'}</span>
              </button>
            </div>

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

      {/* ── MODAL: Invite Link ── */}
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
              <input
                type="text"
                className="ah-modal-input"
                placeholder="https://spotway.app/join/spw-metro hoặc SPW-9921"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                autoFocus
              />
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
                    ? (lang === 'VI' ? 'Đang tìm...' : 'Searching...')
                    : (lang === 'VI' ? 'Xác nhận tham gia' : 'Join workspace')}
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
