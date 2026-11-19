import { useCallback, useEffect, useState } from 'react'
import { App as AntApp } from 'antd'
import {
  getOwnerContracts,
  submitContractRenewalRequest,
} from '../../api/contracts'
import { getTenantOverview } from '../../api/tenant'
import { useAuthStore } from '../../auth/store'
import { useBuildingStore } from '../../store/useBuildingStore'
import { ContractScanViewer } from '../../components/contracts/ContractScanViewer'
import type { ServiceContract } from '../../types/contract'
import {
  formatContractValue,
  formatDateVN,
  getContractLifecycle,
} from '../../types/contract'
import type { TenantOverview } from '../../types/auth'
import '../Admin/AdminPages.css'
import '../Admin/ContractsPage.css'

export function OwnerContractsPage() {
  const { message } = AntApp.useApp()
  const user = useAuthStore((s) => s.user)
  const buildings = useBuildingStore((s) => s.buildings)
  const loadBuildings = useBuildingStore((s) => s.loadBuildings)

  const [contracts, setContracts] = useState<ServiceContract[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [overview, setOverview] = useState<TenantOverview | null>(null)
  const [loading, setLoading] = useState(true)

  // Renewal / Quota Upgrade Request Modal
  const [renewModalOpen, setRenewModalOpen] = useState(false)
  const [renewNote, setRenewNote] = useState(
    'Đề nghị Admin gia hạn hợp đồng thêm 12 tháng và mở rộng hạn mức tòa nhà 3D.',
  )
  const [submittingRenew, setSubmittingRenew] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [cntList, ov] = await Promise.all([
        getOwnerContracts(user),
        getTenantOverview().catch(() => null),
        loadBuildings().catch(() => undefined),
      ])
      setContracts(cntList)
      setOverview(ov)
      if (cntList.length > 0 && !selectedId) {
        setSelectedId(cntList[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [user, loadBuildings, selectedId])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectedContract =
    contracts.find((c) => c.id === selectedId) ?? contracts[0] ?? null
  const lifecycle = selectedContract ? getContractLifecycle(selectedContract) : null

  const usedBuildings = buildings.length || overview?.usage.buildings || 0
  const usedFloors = overview?.usage.floors ?? 0

  async function handleSendRenewalRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedContract) return
    setSubmittingRenew(true)
    try {
      const updated = await submitContractRenewalRequest(
        selectedContract.id,
        renewNote.trim() || 'Đề nghị gia hạn hợp đồng dịch vụ thêm 12 tháng.',
      )
      setContracts((prev) =>
        prev.map((c) => (c.id === selectedContract.id ? updated : c)),
      )
      setRenewModalOpen(false)
      message.success(
        'Đã gửi yêu cầu gia hạn / điều chỉnh hợp đồng tới Quản trị viên hệ thống (Admin)!',
      )
    } finally {
      setSubmittingRenew(false)
    }
  }

  return (
    <div className="adm-page">
      {/* ── Top Header ── */}
      <header className="adm-hero">
        <div>
          <div className="adm-hero__eyebrow" style={{ color: '#5de6ff' }}>
            <span
              className="adm-hero__eyebrow-dot"
              style={{ background: '#5de6ff', boxShadow: '0 0 8px #5de6ff' }}
            />
            <span>CHỦ TÒA NHÀ · HỢP ĐỒNG CẤP QUYỀN HẠ TẦNG</span>
          </div>
          <div className="adm-hero__title-row">
            <h1 className="adm-hero__title">Hợp đồng dịch vụ</h1>
            {selectedContract && (
              <span className="adm-count-pill">#{selectedContract.contractCode}</span>
            )}
          </div>
          <p className="adm-hero__subtitle">
            Hợp đồng ký kết trực tiếp với Quản trị viên (Admin) cấp hạn mức tòa nhà, mặt sàn 3D và
            quyền vận hành cho doanh nghiệp của bạn.
          </p>
        </div>

        <div className="adm-hero__actions">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={() => setRenewModalOpen(true)}
            disabled={!selectedContract}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
              history_edu
            </span>
            <span>Yêu cầu gia hạn / Nâng hạn mức</span>
          </button>
        </div>
      </header>

      {/* ── 3 KPI Stat Cards for Building Owner ── */}
      {selectedContract && lifecycle && (
        <section className="cnt-stat-grid">
          {/* Card 1: Contract Validity */}
          <div className="adm-glass-card cnt-stat-card" style={{ cursor: 'default' }}>
            <div
              className="cnt-stat-card__glow"
              style={{ background: 'rgba(16, 185, 129, 0.16)' }}
            />
            <div className="cnt-stat-card__info">
              <span className="cnt-stat-card__label">Trạng thái hiệu lực</span>
              <span
                className="cnt-stat-card__value"
                style={{
                  color:
                    lifecycle.status === 'expired'
                      ? '#ef4444'
                      : lifecycle.status === 'expiring'
                        ? '#f59e0b'
                        : '#10b981',
                  fontSize: 34,
                }}
              >
                {lifecycle.daysRemaining >= 0
                  ? `Còn ${lifecycle.daysRemaining} ngày`
                  : 'Đã hết hạn'}
              </span>
              <span className="cnt-stat-card__sub">
                Hiệu lực: {lifecycle.formattedStartDate} – {lifecycle.formattedEndDate}
              </span>
            </div>
            <div
              className="cnt-stat-card__icon"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 30 }}>
                verified_user
              </span>
            </div>
          </div>

          {/* Card 2: Infrastructure Quota (Buildings & 3D Floors) */}
          <div className="adm-glass-card cnt-stat-card" style={{ cursor: 'default' }}>
            <div
              className="cnt-stat-card__glow"
              style={{ background: 'rgba(93, 230, 255, 0.16)' }}
            />
            <div className="cnt-stat-card__info">
              <span className="cnt-stat-card__label">Hạn mức Tòa nhà &amp; Mặt sàn 3D</span>
              <span
                className="cnt-stat-card__value"
                style={{ color: '#5de6ff', fontSize: 34 }}
              >
                {usedBuildings} / {selectedContract.maxBuildings}{' '}
                <span style={{ fontSize: 16, fontWeight: 500, color: '#958ea0' }}>
                  tòa nhà
                </span>
              </span>
              <span className="cnt-stat-card__sub">
                Đã số hóa {usedFloors} / {selectedContract.maxFloors} mặt sàn 3D cam kết
              </span>
            </div>
            <div
              className="cnt-stat-card__icon"
              style={{
                background: 'rgba(93, 230, 255, 0.14)',
                color: '#5de6ff',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 30 }}>
                domain
              </span>
            </div>
          </div>

          {/* Card 3: Contract Value & Payment */}
          <div className="adm-glass-card cnt-stat-card" style={{ cursor: 'default' }}>
            <div
              className="cnt-stat-card__glow"
              style={{ background: 'rgba(236, 72, 153, 0.16)' }}
            />
            <div className="cnt-stat-card__info">
              <span className="cnt-stat-card__label">Giá trị hợp đồng ký với Admin</span>
              <span
                className="cnt-stat-card__value"
                style={{ color: '#f472b6', fontSize: 34 }}
              >
                {formatContractValue(selectedContract)}
              </span>
              <span className="cnt-stat-card__sub" style={{ color: '#10b981' }}>
                ✓{' '}
                {selectedContract.paymentStatus === 'paid'
                  ? 'Đã nghiệm thu & thanh toán kỳ hiện tại'
                  : 'Đang chờ đối soát thanh toán'}
              </span>
            </div>
            <div
              className="cnt-stat-card__icon"
              style={{
                background: 'rgba(236, 72, 153, 0.15)',
                color: '#f472b6',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 30 }}>
                contract
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── Split Grid: Left Summary & History + Right Full Scanned Document Viewer ── */}
      {loading && !selectedContract ? (
        <div
          className="adm-glass-card"
          style={{ padding: 48, textAlign: 'center', color: '#958ea0' }}
        >
          Đang tải hồ sơ hợp đồng...
        </div>
      ) : selectedContract && lifecycle ? (
        <div className="cnt-split-grid">
          {/* Left Column: Contract Overview & Terms with Admin */}
          <div className="adm-glass-card cnt-drawer">
            <div className="cnt-drawer__header">
              <div className="cnt-drawer__title-wrap">
                <div className="cnt-drawer__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                    gavel
                  </span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="cnt-drawer__code">
                      Hợp đồng #{selectedContract.contractCode}
                    </span>
                    <span className={`cnt-status-pill cnt-status-pill--${lifecycle.status}`}>
                      {lifecycle.statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#958ea0', marginTop: 2 }}>
                    Cấp quyền trực tiếp từ Quản trị viên hệ thống SpotWay Spatial OS
                  </div>
                </div>
              </div>
            </div>

            {selectedContract.renewalRequested && (
              <div className="cnt-renewal-alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    hourglass_top
                  </span>
                  <div>
                    <strong>Đã gửi yêu cầu tới Admin:</strong> {selectedContract.renewalNote}
                  </div>
                </div>
                <span className="cnt-status-pill cnt-status-pill--expiring">
                  Chờ Admin duyệt
                </span>
              </div>
            )}

            <div className="cnt-info-grid">
              <div className="cnt-info-item">
                <span className="cnt-info-label">Bên A (Đơn vị cung cấp / Admin)</span>
                <span className="cnt-info-value" style={{ color: '#f472b6' }}>
                  SpotWay Spatial OS JSC
                </span>
                <span className="cnt-info-sub">
                  Quản trị viên cấp cao · Hỗ trợ kỹ thuật 24/7
                </span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Bên B (Chủ tòa nhà / Doanh nghiệp)</span>
                <span className="cnt-info-value" style={{ color: '#5de6ff' }}>
                  {selectedContract.customerName}
                </span>
                <span className="cnt-info-sub">
                  {selectedContract.representative} · {selectedContract.ownerEmail}
                </span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Tên miền Không gian 3D</span>
                <span className="cnt-info-value">{selectedContract.workspaceDomain}</span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Thời hạn cam kết</span>
                <span className="cnt-info-value">
                  {formatDateVN(selectedContract.startDate)} –{' '}
                  {formatDateVN(selectedContract.endDate)}
                </span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Quyền khởi tạo Tòa nhà</span>
                <span className="cnt-info-value">
                  Tối đa {selectedContract.maxBuildings} tòa nhà (Đang có {usedBuildings})
                </span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Quyền xuất bản Mặt sàn 3D</span>
                <span className="cnt-info-value">
                  Tối đa {selectedContract.maxFloors} mặt sàn (Đang có {usedFloors})
                </span>
              </div>

              <div className="cnt-note-box">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18, color: '#5de6ff', marginTop: 1 }}
                >
                  verified
                </span>
                <div>
                  <strong style={{ color: '#ffffff' }}>Điều khoản vận hành: </strong>
                  <span>“{selectedContract.notes}”</span>
                </div>
              </div>
            </div>

            {/* Progress bar of contract duration */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: 'rgba(13, 13, 28, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12.5,
                  marginBottom: 8,
                }}
              >
                <span style={{ color: '#cbc3d7', fontWeight: 600 }}>
                  Tiến độ thời hạn hợp đồng ({lifecycle.durationMonths} tháng)
                </span>
                <span style={{ color: '#5de6ff', fontWeight: 700 }}>
                  Đã sử dụng {lifecycle.elapsedPercent}% thời gian
                </span>
              </div>
              <div className="cnt-progress-track" style={{ height: 8 }}>
                <div
                  className="cnt-progress-fill"
                  style={{
                    width: `${lifecycle.elapsedPercent}%`,
                    background: 'linear-gradient(90deg, #5de6ff, #a078ff, #f472b6)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Scanned Contract Document Viewer */}
          <div className="adm-glass-card cnt-drawer">
            <ContractScanViewer contract={selectedContract} />
          </div>
        </div>
      ) : null}

      {/* ── Modal: Request Renewal / Quota Adjustment to Admin ── */}
      {renewModalOpen && selectedContract && (
        <div
          className="adm-modal-backdrop"
          onClick={() => !submittingRenew && setRenewModalOpen(false)}
          role="presentation"
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="adm-modal__header">
              <div className="adm-modal__header-left">
                <div className="adm-modal__icon">
                  <span className="material-symbols-outlined">history_edu</span>
                </div>
                <div>
                  <h2 className="adm-modal__title">
                    Yêu cầu gia hạn / Điều chỉnh hợp đồng
                  </h2>
                  <p className="adm-modal__subtitle">
                    Gửi đề xuất trực tiếp tới Quản trị viên hệ thống cho hợp đồng #
                    {selectedContract.contractCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="adm-modal__close"
                onClick={() => setRenewModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendRenewalRequest} className="adm-modal__body">
              <div className="adm-field">
                <label className="adm-field__label">
                  Nội dung đề xuất gửi tới Admin *
                </label>
                <textarea
                  className="adm-input"
                  style={{ minHeight: 96, paddingTop: 10, resize: 'vertical' }}
                  value={renewNote}
                  onChange={(e) => setRenewNote(e.target.value)}
                  required
                />
              </div>

              <div className="adm-modal__footer">
                <button
                  type="button"
                  className="adm-btn"
                  onClick={() => setRenewModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn--primary"
                  disabled={submittingRenew}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    send
                  </span>
                  <span>
                    {submittingRenew ? 'Đang gửi...' : 'Gửi yêu cầu cho Admin'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerContractsPage

