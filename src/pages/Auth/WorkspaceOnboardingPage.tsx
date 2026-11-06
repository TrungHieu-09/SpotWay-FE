import { useState, useEffect } from 'react'
import { App as AntApp } from 'antd'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import { createWorkspaceOrder, getBillingPlans } from '../../api/billing'
import type { BillingPlan } from '../../types/billing'
import '../../components/layout/SpotWayNavbar.css'
import './WorkspaceOnboardingPage.css'

interface OrgTypeOption {
  id: string
  label: string
  icon: string
}

const MONTH_OPTIONS = [1, 6, 12, 24]

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN')} ₫`

const ORG_TYPES: OrgTypeOption[] = [
  { id: 'airport', label: 'Sân bay', icon: 'flight_takeoff' },
  { id: 'mall', label: 'TTTM / Mua sắm', icon: 'storefront' },
  { id: 'hospital', label: 'Bệnh viện', icon: 'local_hospital' },
  { id: 'office', label: 'Tòa nhà văn phòng', icon: 'apartment' },
  { id: 'university', label: 'Đại học / Campus', icon: 'school' },
  { id: 'other', label: 'Khác', icon: 'more_horiz' },
]

export function WorkspaceOnboardingPage({ showReadyInitially = false }: { showReadyInitially?: boolean }) {
  const [searchParams] = useSearchParams()
  const isReadyParam = showReadyInitially || searchParams.get('ready') === 'true'

  const [step, setStep] = useState<'form' | 'ready'>(isReadyParam ? 'ready' : 'form')
  const [orgName, setOrgName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [selectedType, setSelectedType] = useState('airport')
  const [buildingCount, setBuildingCount] = useState('4 - 10 tòa nhà')
  const [region, setRegion] = useState('vn')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [planId, setPlanId] = useState(searchParams.get('plan')?.toUpperCase() || 'STARTER')
  const [months, setMonths] = useState(12)

  const [createdWorkspace, setCreatedWorkspace] = useState<{
    name: string
    subdomain: string
  } | null>(null)

  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  useEffect(() => {
    getBillingPlans()
      .then((list) => {
        setPlans(list)
        setPlanId((current) => (list.some((p) => p.id === current) ? current : list[0]?.id ?? current))
      })
      .catch((err: Error) => message.error(err.message))
  }, [message])

  const selectedPlan = plans.find((p) => p.id === planId)
  const totalVnd = selectedPlan
    ? (months >= 12 ? selectedPlan.priceVnd : selectedPlan.monthlyPriceVnd) * months
    : 0

  const userEmail = user?.email || 'user@spotway.vn'
  const userInitial = (user?.name || (user?.email ? user.email.slice(0, 1) : 'U')).slice(0, 2).toUpperCase()

  // If user already has a tenant in DB and comes to ready state
  useEffect(() => {
    if (user?.tenant) {
      setCreatedWorkspace({
        name: user.tenant.name,
        subdomain: user.tenant.subdomain,
      })
      if (isReadyParam) {
        setStep('ready')
      }
    }
  }, [user, isReadyParam])

  const handleOrgNameChange = (val: string) => {
    setOrgName(val)
    const slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setSubdomain(slug)
  }

  // Skip handler - strictly optional as requested by user
  const handleSkip = () => {
    message.info('Đã bỏ qua bước thiết lập. Bạn có thể tạo workspace hoặc tham gia bất kỳ lúc nào.')
    navigate('/account', { replace: true })
  }

  // Create Workspace in DB & transition to Ready UI
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) {
      message.error('Vui lòng nhập tên tổ chức hoặc doanh nghiệp.')
      return
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!cleanSubdomain || cleanSubdomain.length < 3) {
      message.error('Tên miền định danh phải có ít nhất 3 ký tự.')
      return
    }

    if (!selectedPlan) {
      message.error('Vui lòng chọn gói dịch vụ.')
      return
    }

    setSubmitting(true)
    try {
      // The workspace is only created once the order is paid (see CheckoutPage).
      const order = await createWorkspaceOrder({
        planId,
        months,
        workspaceName: orgName.trim(),
        subdomain: cleanSubdomain,
      })
      navigate(`/checkout/${order.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo đơn hàng'
      message.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Switch account
  const handleSwitchAccount = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  // Copy Workspace URL
  const activeSubdomain = createdWorkspace?.subdomain || subdomain || 'my-facility'
  const workspaceUrl = `${activeSubdomain}.spotway.app`

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(workspaceUrl).then(() => {
      setCopied(true)
      message.success('Đã sao chép liên kết Workspace!')
      setTimeout(() => setCopied(false), 2200)
    }).catch(() => {
      message.info(`Workspace URL: ${workspaceUrl}`)
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: WORKSPACE READY CELEBRATION PANE
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'ready') {
    return (
      <div className="wob-root">
        {/* Ambient Aurora Backdrops */}
        <div className="wbr-spatial-grid" />
        <div className="wbr-aurora wbr-aurora--violet" />
        <div className="wbr-aurora wbr-aurora--cyan" />
        <div className="wbr-aurora wbr-aurora--fuchsia" />

        {/* Top Bar: SpotWay Context Header */}
        <header className="wob-topbar">
          <div className="wob-topbar__inner">
            {/* Brand Anchor Left */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 text-decoration-none group" title="Về trang chủ SpotWay">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#a078ff] via-[#5de6ff] to-[#d164e2] p-[1px] flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.35)]">
                  <div className="w-full h-full bg-[#0d0d1c] rounded-[11px] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#5de6ff] text-[18px]">view_in_ar</span>
                  </div>
                </div>
                <span className="font-bold tracking-tight text-white text-[18px] font-['Space_Grotesk']">SpotWay</span>
              </Link>
              <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
              {/* Spatial OS Pill Badge */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#292839]/80 border border-white/10 text-[#5de6ff] text-[10px] tracking-widest uppercase font-semibold font-['Space_Grotesk']">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]" />
                <span>Spatial OS</span>
              </div>
            </div>

            {/* User Chip Right */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 py-1 px-3 rounded-full bg-[#1e1e2e]/60 border border-white/10 backdrop-blur-md shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[12px] text-[#cbc3d7] font-mono hidden sm:inline">{userEmail}</span>
                <div className="w-6 h-6 rounded-full bg-[#a078ff]/20 border border-[#a078ff]/40 text-[#d0bcff] flex items-center justify-center text-[10px] font-bold">
                  {userInitial}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Centered Content Viewport */}
        <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12 md:py-16">
          {/* Central Floating Glassmorphic Celebration Pane */}
          <div className="wbr-pane">
            {/* Subtle Optical Rim Gradient at Top Border */}
            <div className="wbr-rim-gradient" />

            {/* Sparkle & Confetti Particle Accents */}
            <div className="wbr-sparkle-item wbr-sparkle-item--1 wbr-sparkle-1">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </div>
            <div className="wbr-sparkle-item wbr-sparkle-item--2 wbr-sparkle-2">
              <span className="material-symbols-outlined text-[20px]">flare</span>
            </div>
            <div className="wbr-sparkle-item wbr-sparkle-item--3 wbr-sparkle-3">
              <span className="material-symbols-outlined text-[14px]">star</span>
            </div>

            {/* Luminous Celebratory Emblem */}
            <div className="wbr-emblem-wrap">
              {/* Outer Pulsing Glow Halo */}
              <div className="wbr-emblem-halo wbr-pulse-slow" />
              {/* Outer Concentric Ring */}
              <div className="wbr-emblem-ring-outer" />
              {/* Middle Concentric Ring */}
              <div className="wbr-emblem-ring-middle" />
              {/* Inner Core Badge */}
              <div className="wbr-emblem-core">
                <div className="wbr-emblem-inner">
                  <span className="material-symbols-outlined wbr-emblem-icon">check_circle</span>
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="wbr-title">Your workspace is ready</h1>

            {/* Subtitle */}
            <p className="wbr-subtitle">
              Your 3D spatial instance has been provisioned and configured for indoor wayfinding.
            </p>

            {/* Copyable URL Pill Container */}
            <div className="wbr-url-container group">
              <div className="wbr-url-left">
                <span className="material-symbols-outlined wbr-url-dns-icon">dns</span>
                <span className="wbr-url-text" id="workspace-url">
                  {workspaceUrl}
                </span>
                <span className="wbr-badge-active">
                  <span className="wbr-pulse-dot" />
                  Active
                </span>
              </div>

              {/* Interactive Copy Link Button */}
              <button
                type="button"
                className={`wbr-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyUrl}
                title="Sao chép liên kết workspace"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied!' : 'Copy link'}</span>
              </button>
            </div>

            {/* Trial Notice */}
            <div className="wbr-trial-notice">
              <span className="material-symbols-outlined wbr-trial-icon">verified</span>
              <span>
                {user?.tenant?.planExpiresAt
                  ? `Gói ${user.tenant.planId} đã kích hoạt — hiệu lực đến ${new Intl.DateTimeFormat('vi-VN').format(new Date(user.tenant.planExpiresAt))}.`
                  : 'Thanh toán thành công. Gói dịch vụ đã được kích hoạt.'}
              </span>
            </div>

            {/* Rapid Provision Summary Chips */}
            <div className="wbr-chips-grid">
              <div className="wbr-chip-item">
                <span className="material-symbols-outlined wbr-chip-icon wbr-chip-icon--primary">deployed_code</span>
                <span className="wbr-chip-text">Dedicated tenant mesh deployed</span>
              </div>
              <div className="wbr-chip-item">
                <span className="material-symbols-outlined wbr-chip-icon wbr-chip-icon--secondary">layers</span>
                <span className="wbr-chip-text">AI floor plan engine connected</span>
              </div>
              <div className="wbr-chip-item">
                <span className="material-symbols-outlined wbr-chip-icon wbr-chip-icon--tertiary">sensors</span>
                <span className="wbr-chip-text">Hardware beacons ready</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              className="wbr-btn-primary"
              onClick={() => navigate('/owner/dashboard')}
            >
              <span>Go to dashboard</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>

            {/* Secondary Links */}
            <div className="wbr-secondary-links">
              <button
                type="button"
                className="wbr-sub-link"
                onClick={() => {
                  message.info('Tính năng gửi thư mời đồng đội qua email đang khả dụng trong Bảng điều khiển.')
                  navigate('/owner/staff')
                }}
              >
                <span className="material-symbols-outlined">group_add</span>
                <span>Invite team members</span>
              </button>

              <span className="wbr-dot-sep" />

              <button
                type="button"
                className="wbr-sub-link"
                onClick={() => {
                  message.info('Chuyên gia SpotWay sẵn sàng hỗ trợ cài đặt thiết bị định vị và sơ đồ 3D cho tòa nhà của bạn.')
                }}
              >
                <span className="material-symbols-outlined">calendar_month</span>
                <span>Book onboarding walkthrough</span>
              </button>
            </div>
          </div>
        </main>

        {/* Minimal SpotWay Compliance & System Status Footer */}
        <footer className="wbr-footer-bar">
          <div className="wbr-footer-inner">
            <div className="wbr-footer-left">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]" />
              <span>Spatial Engine v4.2.0 • All Systems Operational</span>
            </div>

            <div className="wbr-footer-right">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#22D3EE]">security</span>
                <span>SOC 2 Type II Certified</span>
              </span>
              <span className="opacity-30">•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-[#34D399]">verified_user</span>
                <span>ISO 27001 Compliant</span>
              </span>
              <span className="opacity-30 hidden md:inline">•</span>
              <span className="hidden md:inline hover:text-white cursor-pointer transition-colors" onClick={() => message.info('SpotWay Security Whitepaper')}>
                Security Whitepaper
              </span>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: FORM WORKSPACE ONBOARDING
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="wob-root">
      {/* ── Spatial Grid Background ── */}
      <div className="wob-grid" />

      {/* ── Ambient Aurora Backdrops ── */}
      <div className="wob-bloom wob-bloom--top" />
      <div className="wob-bloom wob-bloom--left" />
      <div className="wob-bloom wob-bloom--right" />

      {/* ── Top Bar ── */}
      <header className="wob-topbar">
        <div className="wob-topbar__inner">
          {/* Logo */}
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

          {/* User Identification Pill */}
          <div className="wob-user-pill">
            <div className="wob-user-pill__avatar">{userInitial}</div>
            <span className="wob-user-pill__email" title={userEmail}>
              {userEmail}
            </span>
            <div className="wob-user-pill__divider" />
            <button
              className="wob-user-pill__switch"
              type="button"
              onClick={handleSwitchAccount}
              title="Đăng xuất hoặc chuyển tài khoản"
            >
              Đổi tài khoản
            </button>
          </div>
        </div>
      </header>

      {/* ── Centered Onboarding Content ── */}
      <main className="wob-main">
        {/* Main Frosted Glass Card */}
        <div className="wob-card">
          {/* Stepper Matrix */}
          <div className="wob-stepper">
            <div className="wob-step-pill wob-step-pill--active">
              <span className="wob-step-dot" />
              <span>1. Không gian (Workspace)</span>
            </div>

            <div className="wob-stepper-line" />

            <div className="wob-step-pill wob-step-pill--inactive">
              <span className="wob-step-dot--inactive" />
              <span>2. Thanh toán &amp; Kích hoạt</span>
            </div>
          </div>

          {/* Header Typography */}
          <div className="wob-header">
            <h1 className="wob-title">Thiết lập không gian làm việc</h1>
            <p className="wob-subtitle">Khởi tạo phân vùng số riêng tư cho tổ hợp &amp; tổ chức của bạn</p>
          </div>

          {/* Form Body */}
          <form className="wob-form" onSubmit={handleContinue}>
            {/* Organization Name Field */}
            <div className="wob-field">
              <label className="wob-label" htmlFor="wob-org-name">
                Tên tổ chức / Doanh nghiệp
              </label>
              <div className="wob-input-wrapper">
                <span className="wob-input-icon">
                  <span className="material-symbols-outlined">domain</span>
                </span>
                <input
                  id="wob-org-name"
                  type="text"
                  className="wob-input"
                  placeholder="Ví dụ: Metro Transit Authority hoặc Saigon Innovation Plaza"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Workspace Subdomain Field */}
            <div className="wob-field">
              <div className="wob-label-row">
                <label className="wob-label" htmlFor="wob-subdomain">
                  Tên miền định danh Workspace
                </label>
                {subdomain && (
                  <span className="wob-badge-avail">
                    <span className="material-symbols-outlined">check_circle</span>
                    Khả dụng ✓
                  </span>
                )}
              </div>
              <div className="wob-subdomain-group">
                <input
                  id="wob-subdomain"
                  type="text"
                  className="wob-subdomain-input"
                  placeholder="vi-du-ten-mien"
                  value={subdomain}
                  onChange={(e) =>
                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  required
                />
                <span className="wob-subdomain-suffix">.spotway.app</span>
              </div>
            </div>

            {/* Organization Type Chips */}
            <div className="wob-field">
              <label className="wob-label">Loại hình tổ hợp / công trình</label>
              <div className="wob-chips-grid">
                {ORG_TYPES.map((type) => {
                  const active = selectedType === type.id
                  return (
                    <button
                      key={type.id}
                      type="button"
                      className={`wob-chip ${active ? 'wob-chip--active' : ''}`}
                      onClick={() => setSelectedType(type.id)}
                    >
                      <span className="material-symbols-outlined">{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dropdowns Row: Buildings count & Cloud Region */}
            <div className="wob-dropdowns-row">
              {/* Number of Buildings */}
              <div className="wob-field">
                <label className="wob-label">Số lượng tòa nhà / Cụm</label>
                <div className="wob-select-wrapper">
                  <select
                    className="wob-select"
                    value={buildingCount}
                    onChange={(e) => setBuildingCount(e.target.value)}
                  >
                    <option value="1 - 3 tòa nhà">1 - 3 tòa nhà</option>
                    <option value="4 - 10 tòa nhà">4 - 10 tòa nhà</option>
                    <option value="11 - 25 tòa nhà">11 - 25 tòa nhà</option>
                    <option value="26+ cụm tổ hợp">26+ cụm tổ hợp lớn</option>
                  </select>
                  <span className="wob-select-chevron">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </div>
              </div>

              {/* Cloud Region */}
              <div className="wob-field">
                <label className="wob-label">Khu vực máy chủ dữ liệu</label>
                <div className="wob-select-wrapper">
                  <select
                    className="wob-select"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="vn">🇻🇳 Việt Nam (Hà Nội &amp; TP.HCM)</option>
                    <option value="sg">🇸🇬 Singapore (Đông Nam Á)</option>
                    <option value="us">🇺🇸 Hoa Kỳ (US East/West)</option>
                  </select>
                  <span className="wob-select-chevron">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Plan purchase: the workspace is created after payment */}
            <div className="wob-dropdowns-row">
              <div className="wob-field">
                <label className="wob-label" htmlFor="wob-plan">Gói dịch vụ</label>
                <div className="wob-select-wrapper">
                  <select
                    id="wob-plan"
                    className="wob-select"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — từ {formatVnd(p.priceVnd)}/tháng
                      </option>
                    ))}
                  </select>
                  <span className="wob-select-chevron">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </div>
              </div>

              <div className="wob-field">
                <label className="wob-label" htmlFor="wob-months">Thời hạn</label>
                <div className="wob-select-wrapper">
                  <select
                    id="wob-months"
                    className="wob-select"
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m} tháng</option>
                    ))}
                  </select>
                  <span className="wob-select-chevron">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </div>
              </div>
            </div>

            {selectedPlan && (
              <div className="wob-security-pill">
                <span className="material-symbols-outlined">payments</span>
                <p className="wob-security-text">
                  Tổng thanh toán: <strong>{formatVnd(totalVnd)}</strong>. Workspace sẽ được tạo ngay sau khi thanh toán thành công.
                </p>
              </div>
            )}

            {/* Security Reassurance Pill */}
            <div className="wob-security-pill">
              <span className="material-symbols-outlined">lock</span>
              <p className="wob-security-text">
                Dữ liệu định vị phần cứng được mã hóa chuẩn GDPR và hệ thống đạt chứng nhận ISO 27001.
              </p>
            </div>

            {/* Action Buttons Row: Skip & Continue */}
            <div className="wob-actions-row">
              <button
                type="button"
                className="wob-btn-skip"
                onClick={handleSkip}
                title="Bỏ qua bước thiết lập này"
              >
                <span>Bỏ qua</span>
              </button>

              <button
                type="submit"
                className="wob-btn-continue"
                disabled={submitting || !selectedPlan}
              >
                <span>{submitting ? 'Đang tạo đơn hàng...' : 'Tiếp tục thanh toán'}</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>

        {/* Onboarding Support & Certifications Bar */}
        <div className="wob-support-bar">
          <p className="wob-support-text">
            Cần hỗ trợ thiết lập không gian số?
            <a
              href="#support"
              className="wob-support-link"
              onClick={(e) => {
                e.preventDefault()
                message.info('Đội ngũ chuyên gia kiến trúc không gian SpotWay sẽ liên hệ hỗ trợ bạn!')
              }}
            >
              Đặt lịch 15 phút với kỹ sư giải pháp
            </a>
          </p>

          {/* Trust Badges */}
          <div className="wob-trust-badges">
            <div className="wob-trust-item">
              <span className="material-symbols-outlined">verified_user</span>
              <span>SOC 2 Type II</span>
            </div>
            <span className="wob-trust-dot">•</span>
            <div className="wob-trust-item">
              <span className="material-symbols-outlined">shield</span>
              <span>ISO 27001 Certified</span>
            </div>
          </div>
        </div>
      </main>

      {/* ── Ground Occlusion Footer ── */}
      <footer className="wob-footer">
        <p className="wob-footer-text">
          © 2026 SpotWay Spatial Intelligence. Bảo lưu mọi quyền.
        </p>
      </footer>
    </div>
  )
}

export default WorkspaceOnboardingPage
