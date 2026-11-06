import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import { SpotWayNavbar } from '../../components/layout/SpotWayNavbar'
import './PricingPage.css'

export function PricingPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // State: Billing cycle (true = yearly - 20% discount, false = monthly)
  const [isYearly, setIsYearly] = useState(true)

  // State: Telemetry usage estimator slider
  const [visitors, setVisitors] = useState<number>(250000)

  // State: FAQ open accordion index (item 1 open by default)
  const [openFaq, setOpenFaq] = useState<number | null>(1)

  // Estimator calculation: 50,000 visitors included for free; 100 ₫ per additional visitor
  const freeAllowance = 50000
  const billedUnits = Math.max(0, visitors - freeAllowance)
  const unitRateVnd = 100
  const estimatedAddonCost = billedUnits * unitRateVnd

  function toggleFaq(index: number) {
    setOpenFaq((prev) => (prev === index ? null : index))
  }

  function getDashboardPath(u?: { role?: string; tenantId?: string | null; tenant?: unknown } | null) {
    if (!u) return '/login'
    if (u.role === 'admin') return '/admin'
    if (u.tenantId || u.tenant) {
      if (u.role === 'building_owner') return '/owner/dashboard'
      if (u.role === 'building_manager') return '/manager'
      if (u.role === 'store_owner') return '/store/profile'
    }
    return '/account'
  }

  // Workspaces are created by an admin; only an existing Building Owner can buy/renew a plan.
  const handlePlanAction = () => {
    if (!user) {
      navigate('/login?redirect=/owner/subscription')
    } else if (user.role === 'building_owner' && user.tenantId) {
      navigate('/owner/subscription')
    } else {
      navigate(getDashboardPath(user))
    }
  }

  return (
    <div className="pricing-page-root selection:bg-purple-500 selection:text-white">
      {/* ── 1. UNIFIED STICKY GLASS NAVBAR ── */}
      <SpotWayNavbar activeTab="pricing" />

      {/* ── MAIN CANVAS ── */}
      <main className="pricing-main-canvas">
        {/* ── 2. HERO & BILLING TOGGLE ── */}
        <section className="pricing-hero">
          <div className="pricing-badge-pill">
            <span className="pricing-badge-pulse" />
            <span className="pricing-badge-text">Kiến trúc Định giá Không gian v2.4</span>
          </div>

          <h1 className="pricing-hero-title">
            Định giá linh hoạt theo quy mô tòa nhà &amp;{' '}
            <span className="pricing-gradient-text">lượng khách thực tế.</span>
          </h1>

          <p className="pricing-hero-desc">
            Triển khai bản đồ số 3D độ chính xác từng centimet và dẫn đường không cần cài ứng dụng cho toàn bộ danh mục bất động sản mà không lo phát sinh phụ phí ẩn.
          </p>

          {/* Billing Frequency Toggle */}
          <div className="pricing-toggle-wrap">
            <button
              type="button"
              className={`pricing-toggle-btn ${!isYearly ? 'active' : ''}`}
              onClick={() => setIsYearly(false)}
            >
              Thanh toán theo tháng
            </button>
            <button
              type="button"
              className={`pricing-toggle-btn ${isYearly ? 'active' : ''}`}
              onClick={() => setIsYearly(true)}
            >
              <span>Thanh toán theo năm</span>
              <span className="pricing-save-pill">Tiết kiệm 20%</span>
            </button>
          </div>
        </section>

        {/* ── 3. THREE PRICING CARDS ── */}
        <section className="pricing-cards-grid">
          {/* CARD 1: GÓI CƠ BẢN */}
          <div className="glass-card">
            <div>
              <div className="pricing-card-top-tag">
                <span className="pricing-tier-tag">Gói Khởi đầu</span>
                <span className="material-symbols-outlined text-[#958ea0] text-[22px]">corporate_fare</span>
              </div>
              <h2 className="pricing-card-title">Cơ bản (Regional)</h2>
              <p className="pricing-card-subtitle">
                Dành cho tòa nhà đơn lẻ, trung tâm bán lẻ quy mô vừa &amp; các showroom bắt đầu số hóa không gian.
              </p>

              <div className="pricing-price-box">
                <div className="pricing-price-row">
                  <span className="pricing-amount">
                    {isYearly ? '1.990.000 ₫' : '2.490.000 ₫'}
                  </span>
                  <span className="pricing-period">/ tháng</span>
                </div>
                <p className="pricing-billing-cycle">
                  {isYearly ? 'Thanh toán hằng năm (23.880.000 ₫ / năm)' : 'Thanh toán linh hoạt theo từng tháng'}
                </p>
              </div>

              {/* Specs */}
              <p className="pricing-specs-heading">Quy mô hạ tầng bao gồm:</p>
              <div className="pricing-specs-list">
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Tối đa <strong>5 tòa nhà</strong> trong hệ thống</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Tối đa <strong>20 tầng</strong> mỗi tòa nhà</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Quét mã <strong>QR Code &amp; Beacon BLE</strong> tức thời</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Báo cáo mật độ &amp; lộ trình cơ bản</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Hỗ trợ kỹ thuật qua Email tiêu chuẩn (SLA 24h)</span>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => handlePlanAction()} className="pricing-card-btn">
              Mua gói Khởi đầu
            </button>
          </div>

          {/* CARD 2: GÓI CHUYÊN NGHIỆP (FEATURED) */}
          <div className="glass-card-featured">
            <div className="pricing-popular-badge">
              ✦ Khuyên dùng nhiều nhất
            </div>

            <div>
              <div className="pricing-card-top-tag" style={{ marginTop: '0.4rem' }}>
                <span className="pricing-tier-tag accent-cyan">Mở rộng Không giới hạn</span>
                <span className="material-symbols-outlined text-[#22d3ee] text-[24px]">domain</span>
              </div>
              <h2 className="pricing-card-title">Chuyên nghiệp (Campus)</h2>
              <p className="pricing-card-subtitle">
                Dành cho trung tâm thương mại lớn, sân bay, bệnh viện đa khoa &amp; khu phức hợp đa tầng cao cấp.
              </p>

              <div className="pricing-price-box">
                <div className="pricing-price-row">
                  <span className="pricing-amount gradient">
                    {isYearly ? '4.990.000 ₫' : '6.290.000 ₫'}
                  </span>
                  <span className="pricing-period">/ tháng</span>
                </div>
                <p className="pricing-billing-cycle accent">
                  {isYearly ? 'Thanh toán hằng năm (59.880.000 ₫ / năm - Tiết kiệm 20%)' : 'Thanh toán linh hoạt theo từng tháng'}
                </p>
              </div>

              {/* Specs */}
              <p className="pricing-specs-heading accent">Mọi quyền lợi gói Cơ bản, cộng thêm:</p>
              <div className="pricing-specs-list">
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span><strong>Không giới hạn số tòa nhà &amp; tầng lầu</strong></span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span><strong>Tự động nhận diện bản vẽ sơ đồ bằng AI</strong> (CAD/PDF sang lưới 3D navmesh)</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span>Bản đồ nhiệt lưu lượng &amp; cảnh báo điểm nghẽn thời gian thực</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span>Hỗ trợ ưu tiên chuyên biệt 24/7 (Cam kết SLA 15 phút)</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span>Tùy biến thương hiệu (White-label) &amp; Tên miền CNAME riêng</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span>Phân quyền đa cấp độ &amp; Chế độ màn hình Kiosk HUD</span>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => handlePlanAction()} className="pricing-card-btn-featured">
              <span>Đăng ký gói Chuyên nghiệp</span>
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </button>
          </div>

          {/* CARD 3: GÓI DOANH NGHIỆP */}
          <div className="glass-card">
            <div>
              <div className="pricing-card-top-tag">
                <span className="pricing-tier-tag">Hạ tầng Quy mô lớn</span>
                <span className="material-symbols-outlined text-[#958ea0] text-[22px]">hub</span>
              </div>
              <h2 className="pricing-card-title">Doanh nghiệp (Enterprise)</h2>
              <p className="pricing-card-subtitle">
                Các tập đoàn bất động sản đa quốc gia, hệ thống ga tàu metro và cơ sở hạ tầng an ninh cấp chính phủ.
              </p>

              <div className="pricing-price-box">
                <div className="pricing-price-row">
                  <span className="pricing-amount">Tùy chỉnh</span>
                </div>
                <p className="pricing-billing-cycle">Liên hệ thỏa thuận hợp đồng SLA riêng</p>
              </div>

              {/* Specs */}
              <p className="pricing-specs-heading">Kiến trúc bảo mật chuyên sâu:</p>
              <div className="pricing-specs-list">
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Triển khai trên <strong>Private Cloud hoặc On-Premise biệt lập (Air-Gapped)</strong></span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Cam kết <strong>Uptime 99.99%</strong> có điều khoản phạt vi phạm</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Tích hợp sâu chuẩn BIM / Revit &amp; hệ thống ERP / CAFM</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Chuyên gia kỹ thuật cấp cao (TAM) đồng hành 1:1</span>
                </div>
                <div className="pricing-spec-item">
                  <span className="material-symbols-outlined pricing-spec-icon">check_circle</span>
                  <span>Tuân thủ toàn diện: SOC 2 Type II, ISO 27001, HIPAA</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.open('mailto:contact@spotway.vn?subject=Tư vấn gói Doanh nghiệp SpotWay', '_blank')}
              className="pricing-card-btn"
            >
              Liên hệ tư vấn Doanh nghiệp
            </button>
          </div>
        </section>

        {/* ── 4. PAY-PER-VISITOR USAGE ESTIMATOR STRIP ── */}
        <section className="pricing-estimator-card">
          <div className="pricing-estimator-glow" />
          <div className="pricing-estimator-grid">
            {/* Left Col: Info & Slider */}
            <div>
              <div className="pricing-estimator-tag">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                <span>Bộ Ước tính Đo lường Dữ liệu</span>
              </div>
              <h2 className="pricing-estimator-title">
                Minh bạch &amp; Dự toán rõ ràng: Tự động mở rộng theo lượng khách
              </h2>
              <p className="pricing-estimator-desc">
                Mỗi gói đăng ký đã bao gồm sẵn <strong>50.000 lượt khách định vị miễn phí mỗi tháng</strong>. Khi quy mô tăng trưởng, bạn chỉ trả 100 ₫ cho mỗi phiên định vị thực tế vượt mức với chu kỳ tính toán tức thì theo giây.
              </p>

              {/* Slider */}
              <div className="pricing-slider-wrap">
                <div className="pricing-slider-header">
                  <span className="text-[#cbc3d7]">Số lượng khách định vị trong tháng:</span>
                  <span className="pricing-slider-value">
                    {visitors.toLocaleString('vi-VN')} lượt khách
                  </span>
                </div>

                <input
                  type="range"
                  min="50000"
                  max="1000000"
                  step="25000"
                  value={visitors}
                  onChange={(e) => setVisitors(parseInt(e.target.value, 10))}
                />

                <div className="pricing-slider-ticks">
                  <span>50.000 (Miễn phí đi kèm)</span>
                  <span>500.000</span>
                  <span>1.000.000+ lượt</span>
                </div>
              </div>
            </div>

            {/* Right Col: Readout */}
            <div className="pricing-readout-card">
              <div>
                <div className="pricing-readout-top">
                  <span>Chi phí Phụ trội ước tính</span>
                  <span className="pricing-live-chip">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    <span>Giả lập trực tiếp</span>
                  </span>
                </div>
                <div className="pricing-readout-cost">
                  {estimatedAddonCost === 0 ? '0 ₫' : `+ ${estimatedAddonCost.toLocaleString('vi-VN')} ₫`}
                  <span className="text-[14px] text-[#cbc3d7] font-normal"> / tháng</span>
                </div>
                <p className="pricing-readout-breakdown">
                  {billedUnits === 0
                    ? '(Nằm trọn vẹn trong 50.000 lượt khách miễn phí)'
                    : `(${billedUnits.toLocaleString('vi-VN')} lượt phụ trội × 100 ₫)`}
                </p>
              </div>

              <div className="pricing-readout-note">
                <span className="material-symbols-outlined text-[#a078ff] text-[18px] shrink-0 mt-0.5">info</span>
                <span>
                  Khách tham quan không cần tải ứng dụng (Zero-download). Hệ thống chỉ ghi nhận phí khi khách chủ động bấm dẫn đường từng bước trong nhà.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. COMPREHENSIVE FEATURE COMPARISON TABLE ── */}
        <section className="pricing-matrix-section">
          <div className="pricing-matrix-heading">
            <h2 className="pricing-matrix-title">Bảng So sánh Tính năng Chi tiết</h2>
            <p className="pricing-matrix-sub">
              Đối chiếu toàn diện năng lực công nghệ không gian, độ chính xác cảm biến và công cụ quản trị tòa nhà.
            </p>
          </div>

          <div className="pricing-table-wrapper">
            <div className="pricing-table-scroll">
              <table className="pricing-matrix-table">
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Tính năng &amp; Năng lực hệ thống</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Cơ bản</th>
                    <th className="pricing-th-featured" style={{ width: '20%', textAlign: 'center' }}>
                      Chuyên nghiệp <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(34,211,238,0.2)', color: '#22d3ee', marginLeft: '4px' }}>PRO</span>
                    </th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Doanh nghiệp</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Category 1 */}
                  <tr className="pricing-cat-row">
                    <td colSpan={4}>1. Quy mô &amp; Sức chứa Hạ tầng</td>
                  </tr>
                  <tr>
                    <td>Số lượng tòa nhà hỗ trợ</td>
                    <td className="pricing-td-center text-[#cbc3d7]">Tối đa 5 tòa nhà</td>
                    <td className="pricing-td-featured">Không giới hạn</td>
                    <td className="pricing-td-center">Tùy biến đa cụm</td>
                  </tr>
                  <tr>
                    <td>Số tầng tối đa mỗi địa điểm</td>
                    <td className="pricing-td-center text-[#cbc3d7]">20 tầng / tòa</td>
                    <td className="pricing-td-featured">Không giới hạn</td>
                    <td className="pricing-td-center">Không giới hạn</td>
                  </tr>
                  <tr>
                    <td>Nhập bản vẽ kiến trúc CAD / BIM / Revit</td>
                    <td className="pricing-td-center text-[#958ea0]">Chỉ PDF &amp; CAD 2D</td>
                    <td className="pricing-td-featured">Tự động nhận diện BIM / Revit</td>
                    <td className="pricing-td-center">Đồng bộ Live Twin ERP</td>
                  </tr>

                  {/* Category 2 */}
                  <tr className="pricing-cat-row">
                    <td colSpan={4}>2. Định vị trong nhà &amp; Tương thích Thiết bị</td>
                  </tr>
                  <tr>
                    <td>Quét mã QR mở bản đồ tức thì (Zero-app)</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                  </tr>
                  <tr>
                    <td>Tam giác đạc Beacon BLE thông minh</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                  </tr>
                  <tr>
                    <td>Định vị dưới mét siêu chính xác UWB &amp; WiFi RTT</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                  </tr>

                  {/* Category 3 */}
                  <tr className="pricing-cat-row">
                    <td colSpan={4}>3. Trí tuệ AI &amp; Công cụ Dẫn đường Không gian</td>
                  </tr>
                  <tr>
                    <td>AI chuyển sơ đồ 2D sang lưới điều hướng 3D Navmesh</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                  </tr>
                  <tr>
                    <td>Định tuyến xe lăn &amp; trợ năng người khuyết tật ADA</td>
                    <td className="pricing-td-center text-[#cbc3d7]">Cơ bản</td>
                    <td className="pricing-td-featured">Ưu tiên dốc &amp; thang máy thời gian thực</td>
                    <td className="pricing-td-center">Tự hành Robot &amp; ADA toàn diện</td>
                  </tr>
                  <tr>
                    <td>Đồng bộ thang cuốn &amp; thang máy liên tầng</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                  </tr>

                  {/* Category 4 */}
                  <tr className="pricing-cat-row">
                    <td colSpan={4}>4. Phân tích Lưu lượng &amp; Báo cáo Hành vi</td>
                  </tr>
                  <tr>
                    <td>Bản đồ nhiệt mật độ di chuyển (Heatmap)</td>
                    <td className="pricing-td-center text-[#958ea0]">Cập nhật trễ 24h</td>
                    <td className="pricing-td-featured">Thời gian thực (Chu kỳ 1s)</td>
                    <td className="pricing-td-center">Luồng luân chuyển mili-giây</td>
                  </tr>
                  <tr>
                    <td>Cảnh báo điểm nghẽn &amp; nguy cơ quá tải luồng người</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                  </tr>
                  <tr>
                    <td>Xuất dữ liệu không gian thô CSV &amp; API Webhook</td>
                    <td className="pricing-td-center text-[#958ea0]">Chỉ CSV</td>
                    <td className="pricing-td-featured">Toàn bộ REST &amp; WebSocket</td>
                    <td className="pricing-td-center">Đường ống Kafka chuyên dụng</td>
                  </tr>

                  {/* Category 5 */}
                  <tr className="pricing-cat-row">
                    <td colSpan={4}>5. Quản trị Đa người dùng &amp; Bảo mật Doanh nghiệp</td>
                  </tr>
                  <tr>
                    <td>Phân quyền vai trò (Admin / Quản lý / Gian hàng)</td>
                    <td className="pricing-td-center text-[#cbc3d7]">Tối đa 3 tài khoản</td>
                    <td className="pricing-td-featured">25 tài khoản (Vai trò tùy biến)</td>
                    <td className="pricing-td-center">Không giới hạn</td>
                  </tr>
                  <tr>
                    <td>Thương hiệu riêng White-Label &amp; Tên miền CNAME</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                  </tr>
                  <tr>
                    <td>Đăng nhập một lần Doanh nghiệp (SSO SAML 2.0 / Okta / Azure)</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-check-icon">check</span></td>
                  </tr>
                  <tr>
                    <td>Triển khai máy chủ On-Premise cô lập mạng (Air-gapped)</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-center font-semibold text-[#22d3ee]">Hỗ trợ hoàn toàn</td>
                  </tr>

                  {/* Category 6 */}
                  <tr className="pricing-cat-row">
                    <td colSpan={4}>6. Cam kết Dịch vụ &amp; Hỗ trợ Kỹ thuật</td>
                  </tr>
                  <tr>
                    <td>Cam kết Uptime SLA máy chủ</td>
                    <td className="pricing-td-center text-[#cbc3d7]">99.5%</td>
                    <td className="pricing-td-featured">99.9%</td>
                    <td className="pricing-td-center">99.99% Cam kết tài chính</td>
                  </tr>
                  <tr>
                    <td>Thời gian phản hồi hỗ trợ kỹ thuật</td>
                    <td className="pricing-td-center text-[#cbc3d7]">Trong 24 giờ</td>
                    <td className="pricing-td-featured">15 phút (Ưu tiên 24/7)</td>
                    <td className="pricing-td-center">Đường dây nóng tức thì</td>
                  </tr>
                  <tr>
                    <td>Kỹ sư phụ trách chuyên biệt (Technical Account Manager)</td>
                    <td className="pricing-td-center"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-featured"><span className="material-symbols-outlined pricing-minus-icon">remove</span></td>
                    <td className="pricing-td-center font-semibold text-[#22d3ee]">Chuyên gia Lead TAM đồng hành</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── 6. TRUST & OPERATIONAL STATS ROW ── */}
        <section className="space-y-6">
          <div className="pricing-stats-grid">
            <div className="pricing-stat-card">
              <div className="pricing-stat-number cyan-violet">99.9%</div>
              <div className="pricing-stat-title">Cam kết Uptime SLA</div>
              <p className="pricing-stat-sub">Cụm định tuyến không gian sẵn sàng cao liên tục 24/7</p>
            </div>

            <div className="pricing-stat-card">
              <div className="pricing-stat-number violet-pink">50+</div>
              <div className="pricing-stat-title">Đại đô thị &amp; Tổ hợp lớn</div>
              <p className="pricing-stat-sub">Sân bay, bệnh viện quốc tế và trung tâm thương mại</p>
            </div>

            <div className="pricing-stat-card">
              <div className="pricing-stat-number pink-cyan">1.000.000+</div>
              <div className="pricing-stat-title">Lộ trình được tính toán / ngày</div>
              <p className="pricing-stat-sub">Độ chính xác milimet qua các kiến trúc đa tầng phức tạp</p>
            </div>
          </div>

          {/* Security Badges */}
          <div className="pricing-badges-strip">
            <span className="pricing-security-badge">
              <span className="material-symbols-outlined">verified_user</span>
              <span>Chứng chỉ SOC 2 Type II</span>
            </span>
            <span className="pricing-security-badge">
              <span className="material-symbols-outlined">lock</span>
              <span>Tiêu chuẩn Bảo mật ISO 27001</span>
            </span>
            <span className="pricing-security-badge">
              <span className="material-symbols-outlined">shield</span>
              <span>Tuân thủ GDPR &amp; HIPAA</span>
            </span>
            <span className="pricing-security-badge">
              <span className="material-symbols-outlined">sensors</span>
              <span>Đồng bộ cảm biến siêu chính xác UWB</span>
            </span>
          </div>
        </section>

        {/* ── 7. FAQ ACCORDION ── */}
        <section className="pricing-faq-section">
          <div className="pricing-faq-header">
            <h2 className="pricing-faq-title">Câu hỏi Thường gặp</h2>
            <p className="pricing-faq-sub">
              Tất cả thông tin bạn cần biết về quy trình triển khai bản đồ 3D, thanh toán và đo lường lưu lượng.
            </p>
          </div>

          <div className="pricing-faq-list">
            {/* Q1 */}
            <div className={`pricing-faq-item ${openFaq === 1 ? 'open' : ''}`}>
              <button type="button" className="pricing-faq-btn" onClick={() => toggleFaq(1)}>
                <span className="pricing-faq-question">
                  <span className="pricing-faq-num">01</span>
                  <span>Tôi cần chuẩn bị gì để bắt đầu với SpotWay?</span>
                </span>
                <span className={`material-symbols-outlined pricing-faq-chevron ${openFaq === 1 ? 'rotate' : ''}`}>
                  expand_more
                </span>
              </button>
              {openFaq === 1 && (
                <div className="pricing-faq-answer">
                  Bạn hoàn toàn không cần đầu tư bất kỳ phần cứng độc quyền nào để bắt đầu. Bạn có thể tải ngay bản vẽ kỹ thuật CAD 2D hoặc file PDF độ phân giải cao lên Công cụ Không gian của SpotWay. Hệ thống AI sẽ tự động phân tích và tạo mô hình lưới điều hướng 3D chỉ trong 5 phút để bạn trải nghiệm dẫn đường thực tế ngay lập tức.
                </div>
              )}
            </div>

            {/* Q2 */}
            <div className={`pricing-faq-item ${openFaq === 2 ? 'open' : ''}`}>
              <button type="button" className="pricing-faq-btn" onClick={() => toggleFaq(2)}>
                <span className="pricing-faq-question">
                  <span className="pricing-faq-num">02</span>
                  <span>Tôi có thể nâng cấp hoặc đổi gói khi diện tích tòa nhà mở rộng không?</span>
                </span>
                <span className={`material-symbols-outlined pricing-faq-chevron ${openFaq === 2 ? 'rotate' : ''}`}>
                  expand_more
                </span>
              </button>
              {openFaq === 2 && (
                <div className="pricing-faq-answer">
                  Có. SpotWay tự động đối soát và tính chi phí bù trừ theo ngày sử dụng thực tế (proration). Khi bạn thêm tòa nhà mới hoặc mở rộng thêm tầng lầu trên trang quản trị, bạn có thể chuyển đổi giữa gói Cơ bản và Chuyên nghiệp chỉ với 1 cú click mà không gây gián đoạn phiên dẫn đường của khách đang tham quan.
                </div>
              )}
            </div>

            {/* Q3 */}
            <div className={`pricing-faq-item ${openFaq === 3 ? 'open' : ''}`}>
              <button type="button" className="pricing-faq-btn" onClick={() => toggleFaq(3)}>
                <span className="pricing-faq-question">
                  <span className="pricing-faq-num">03</span>
                  <span>"Lượt khách định vị tích cực" được theo dõi và tính phí như thế nào?</span>
                </span>
                <span className={`material-symbols-outlined pricing-faq-chevron ${openFaq === 3 ? 'rotate' : ''}`}>
                  expand_more
                </span>
              </button>
              {openFaq === 3 && (
                <div className="pricing-faq-answer">
                  Một lượt khách tích cực chỉ được tính khi khách hàng chủ động bấm tìm lộ trình từng bước (turn-by-turn navigation) hoặc theo dõi chấm xanh định vị di chuyển trong tòa nhà. Việc khách chỉ mở xem danh bạ gian hàng hoặc xem bản đồ tĩnh hoàn toàn KHÔNG bị tính phí. Mọi gói cước đều tặng sẵn 50.000 lượt khách miễn phí mỗi tháng.
                </div>
              )}
            </div>

            {/* Q4 */}
            <div className={`pricing-faq-item ${openFaq === 4 ? 'open' : ''}`}>
              <button type="button" className="pricing-faq-btn" onClick={() => toggleFaq(4)}>
                <span className="pricing-faq-question">
                  <span className="pricing-faq-num">04</span>
                  <span>SpotWay có hỗ trợ triển khai On-Premise hoặc Private Cloud cho cơ sở bảo mật cao không?</span>
                </span>
                <span className={`material-symbols-outlined pricing-faq-chevron ${openFaq === 4 ? 'rotate' : ''}`}>
                  expand_more
                </span>
              </button>
              {openFaq === 4 && (
                <div className="pricing-faq-answer">
                  Có. Gói Doanh nghiệp (Enterprise) cung cấp trọn bộ gói cài đặt container Docker / Kubernetes chạy hoàn toàn độc lập, tách biệt mạng Internet (Air-gapped) hoặc triển khai trên hạ tầng đám mây riêng của bạn (AWS GovCloud, Azure Government, hệ thống máy chủ nội bộ) nhằm đáp ứng các yêu cầu bảo mật cấp cao nhất.
                </div>
              )}
            </div>

            {/* Q5 */}
            <div className={`pricing-faq-item ${openFaq === 5 ? 'open' : ''}`}>
              <button type="button" className="pricing-faq-btn" onClick={() => toggleFaq(5)}>
                <span className="pricing-faq-question">
                  <span className="pricing-faq-num">05</span>
                  <span>Chính sách hoàn tiền và điều khoản hủy dịch vụ như thế nào?</span>
                </span>
                <span className={`material-symbols-outlined pricing-faq-chevron ${openFaq === 5 ? 'rotate' : ''}`}>
                  expand_more
                </span>
              </button>
              {openFaq === 5 && (
                <div className="pricing-faq-answer">
                  Gói dịch vụ thanh toán theo tháng có thể hủy bất kỳ lúc nào mà không phát sinh chi phí phạt. Với gói trả theo năm, chúng tôi cam kết hoàn tiền 100% trong 30 ngày đầu tiên nếu không đáp ứng được yêu cầu của bạn. Toàn bộ dữ liệu bản đồ số hóa đều có thể xuất dưới định dạng mở glTF/CAD bất kỳ lúc nào.
                </div>
              )}
            </div>

            {/* Q6 */}
            <div className={`pricing-faq-item ${openFaq === 6 ? 'open' : ''}`}>
              <button type="button" className="pricing-faq-btn" onClick={() => toggleFaq(6)}>
                <span className="pricing-faq-question">
                  <span className="pricing-faq-num">06</span>
                  <span>SpotWay hỗ trợ những hình thức thanh toán và xuất hóa đơn nào?</span>
                </span>
                <span className={`material-symbols-outlined pricing-faq-chevron ${openFaq === 6 ? 'rotate' : ''}`}>
                  expand_more
                </span>
              </button>
              {openFaq === 6 && (
                <div className="pricing-faq-answer">
                  Chúng tôi hỗ trợ chuyển khoản ngân hàng qua mã VietQR tự động kích hoạt tức thì, thẻ thanh toán quốc tế (Visa, Mastercard, JCB), và hợp đồng thanh toán doanh nghiệp với hóa đơn giá trị gia tăng điện tử (e-VAT Invoice) theo đúng quy định pháp luật Việt Nam.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 8. FINAL CALL-TO-ACTION BANNER ── */}
        <section className="pricing-cta-banner">
          <div className="pricing-cta-aura" />
          <div className="pricing-cta-content">
            <h2 className="pricing-cta-title">
              Sẵn sàng triển khai trí tuệ không gian thế hệ mới?
            </h2>
            <p className="pricing-cta-desc">
              Khởi tạo bản đồ số 3D đầu tiên của bạn chỉ trong 15 phút. Nâng tầm trải nghiệm tìm đường cho hàng triệu khách tham quan và tối ưu hóa doanh thu mặt bằng ngay hôm nay.
            </p>

            <div className="pricing-cta-actions">
              <Link to="/login" className="pricing-cta-btn-primary">
                <span>Đăng nhập hệ thống</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <button
                type="button"
                onClick={() => window.open('mailto:contact@spotway.vn?subject=Yêu cầu Demo 3D SpotWay', '_blank')}
                className="pricing-cta-btn-secondary"
              >
                <span className="material-symbols-outlined text-[18px]">videocam</span>
                <span>Đặt lịch Demo 3D trực tiếp</span>
              </button>
            </div>

            <div className="pricing-cta-guarantees">
              <span>
                <span className="material-symbols-outlined">check_circle</span>
                Không cần phần cứng độc quyền
              </span>
              <span>
                <span className="material-symbols-outlined">check_circle</span>
                Tương thích CAD / BIM / PDF
              </span>
              <span>
                <span className="material-symbols-outlined">check_circle</span>
                Cam kết SLA 99.9% Uptime
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="pricing-footer">
        <div className="pricing-footer-inner">
          <div className="pricing-footer-cols">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8b5cf6] to-[#22d3ee] flex items-center justify-center p-0.5">
                  <div className="w-full h-full bg-[#0d0d1c] rounded-[6px] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#22d3ee] text-[16px]">near_me</span>
                  </div>
                </div>
                <span className="text-[1.1rem] font-bold text-white pricing-font-headline">SpotWay</span>
              </div>
              <p className="pricing-footer-brand-desc">
                Nền tảng quản lý không gian và dẫn đường trong nhà 3D thế hệ mới cho các đại trung tâm thương mại, sân bay, bệnh viện và khu phức hợp cao tầng.
              </p>
            </div>

            <div>
              <h3 className="pricing-footer-heading">Giải pháp</h3>
              <ul className="pricing-footer-links">
                <li><Link to="/#features">Bản đồ số 3D Digital Twin</Link></li>
                <li><Link to="/#features">Định vị QR &amp; BLE Beacon</Link></li>
                <li><Link to="/#features">Nhận diện sơ đồ tầng AI</Link></li>
                <li><Link to="/#features">Bản đồ nhiệt &amp; Dòng người</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="pricing-footer-heading">Nền tảng</h3>
              <ul className="pricing-footer-links">
                <li><Link to="/pricing">Bảng giá dịch vụ</Link></li>
                <li><Link to="/#roles">Phân quyền quản trị</Link></li>
                <li><Link to="/login">Cổng đăng nhập hệ thống</Link></li>
                <li><a href="mailto:support@spotway.vn">Trung tâm hỗ trợ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="pricing-footer-heading">Pháp lý &amp; Bảo mật</h3>
              <ul className="pricing-footer-links">
                <li><a href="#">Chính sách bảo mật</a></li>
                <li><a href="#">Điều khoản sử dụng dịch vụ</a></li>
                <li><a href="#">Tiêu chuẩn an toàn dữ liệu</a></li>
              </ul>
            </div>
          </div>

          <div className="pricing-footer-bottom">
            <div>
              © 2025 SpotWay Inc. Bảo lưu mọi quyền. Đã đăng ký nhãn hiệu trí tuệ không gian.
            </div>
            <div className="flex gap-4">
              <a href="#">Tài liệu API</a>
              <a href="#">Cổng nhà phát triển</a>
              <a href="#">Chính sách Cookie</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

