import { useState } from 'react'
import { App as AntApp } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import './WorkspaceOnboardingPage.css'

interface OrgTypeOption {
  id: string
  label: string
  icon: string
}

const ORG_TYPES: OrgTypeOption[] = [
  { id: 'airport', label: 'Sân bay', icon: 'flight_takeoff' },
  { id: 'mall', label: 'TTTM / Mua sắm', icon: 'storefront' },
  { id: 'hospital', label: 'Bệnh viện', icon: 'local_hospital' },
  { id: 'office', label: 'Tòa nhà văn phòng', icon: 'apartment' },
  { id: 'university', label: 'Đại học / Campus', icon: 'school' },
  { id: 'other', label: 'Khác', icon: 'more_horiz' },
]

export function WorkspaceOnboardingPage() {
  const [orgName, setOrgName] = useState('Metro Transit Authority')
  const [subdomain, setSubdomain] = useState('metro-transit')
  const [selectedType, setSelectedType] = useState('airport')
  const [buildingCount, setBuildingCount] = useState('4 - 10 tòa nhà')
  const [region, setRegion] = useState('vn')
  const [submitting, setSubmitting] = useState(false)

  const navigate = useNavigate()
  const { message } = AntApp.useApp()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const userEmail = user?.email || 'elena@metro.com'
  const userInitial = (user?.name || userEmail.slice(0, 1)).slice(0, 1).toUpperCase()

  // Skip handler - strictly optional as requested by user
  const handleSkip = () => {
    message.info('Đã bỏ qua bước thiết lập. Bạn có thể cấu hình lại trong phần Cài đặt bất kỳ lúc nào.')
    navigate('/owner/dashboard', { replace: true })
  }

  // Continue to Plan / Dashboard handler
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) {
      message.error('Vui lòng nhập tên tổ chức hoặc doanh nghiệp.')
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      message.success(`Đã khởi tạo Workspace "${orgName}" thành công!`)
      // Chuyển sang trang gói dịch vụ hoặc dashboard
      navigate('/owner/subscription', { replace: true })
    }, 600)
  }

  // Switch account
  const handleSwitchAccount = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

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
          <Link to="/" className="wob-brand" title="Về trang chủ SpotWay">
            <div className="wob-brand__logo">
              <div className="wob-brand__logo-inner">
                <span className="material-symbols-outlined">deployed_code</span>
              </div>
            </div>
            <span className="wob-brand__name">SpotWay</span>
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
              <span>2. Gói dịch vụ</span>
            </div>
          </div>

          {/* Header Typography */}
          <div className="wob-header">
            <h1 className="wob-title">Thiết lập không gian làm việc</h1>
            <p className="wob-subtitle">Khởi tạo phân vùng số riêng tư cho tổ hợp & tổ chức của bạn</p>
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
                  placeholder="Ví dụ: Tập đoàn Quản lý Bất động sản Saigon"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
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
                <span className="wob-badge-avail">
                  <span className="material-symbols-outlined">check_circle</span>
                  Khả dụng ✓
                </span>
              </div>
              <div className="wob-subdomain-group">
                <input
                  id="wob-subdomain"
                  type="text"
                  className="wob-subdomain-input"
                  placeholder="metro-transit"
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
                    <option value="vn">🇻🇳 Việt Nam (Hà Nội & TP.HCM)</option>
                    <option value="sg">🇸🇬 Singapore (Đông Nam Á)</option>
                    <option value="us">🇺🇸 Hoa Kỳ (US East/West)</option>
                  </select>
                  <span className="wob-select-chevron">
                    <span className="material-symbols-outlined">expand_more</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Security Reassurance Pill */}
            <div className="wob-security-pill">
              <span className="material-symbols-outlined">lock</span>
              <p className="wob-security-text">
                Dữ liệu định vị phần cứng được mã hóa chuẩn GDPR và hệ thống đạt chứng nhận ISO 27001.
              </p>
            </div>

            {/* Action Buttons Row: Skip & Continue */}
            <div className="wob-actions-row">
              {/* Skip Button (Explicitly skippable as requested) */}
              <button
                type="button"
                className="wob-btn-skip"
                onClick={handleSkip}
                title="Bỏ qua bước này và vào bảng điều khiển ngay"
              >
                <span>Bỏ qua, tôi đã có không gian hoặc được mời</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  arrow_forward
                </span>
              </button>

              {/* Continue to Plan Button */}
              <button
                type="submit"
                className="wob-btn-continue"
                disabled={submitting}
              >
                <span>{submitting ? 'Đang khởi tạo...' : 'Tiếp tục chọn Gói'}</span>
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

