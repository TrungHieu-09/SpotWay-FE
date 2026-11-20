import { useCallback, useEffect, useState } from 'react'
import { App as AntApp } from 'antd'
import { Link } from 'react-router-dom'
import { getOwnerContract, getOwnerContracts, submitContractRenewalRequest } from '../../api/contracts'
import { getTenantOverview } from '../../api/tenant'
import { useBuildingStore } from '../../store/useBuildingStore'
import { ContractScanViewer } from '../../components/contracts/ContractScanViewer'
import type { ServiceContract } from '../../types/contract'
import {
  formatContractValue,
  getContractLifecycle,
} from '../../types/contract'
import type { TenantOverview } from '../../types/auth'
import '../Admin/AdminPages.css'
import '../Admin/ContractsPage.css'

export function OwnerContractsPage() {
  const { message } = AntApp.useApp()
  const buildings = useBuildingStore((s) => s.buildings)
  const loadBuildings = useBuildingStore((s) => s.loadBuildings)

  const [contracts, setContracts] = useState<ServiceContract[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [overview, setOverview] = useState<TenantOverview | null>(null)
  const [loading, setLoading] = useState(true)

  const [loadError, setLoadError] = useState<string | null>(null)

  // Renewal request dialog
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewNote, setRenewNote] = useState('')
  const [sendingRenew, setSendingRenew] = useState(false)

  // Contract History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [cntList, ov] = await Promise.all([
        getOwnerContracts(),
        getTenantOverview().catch(() => null),
        loadBuildings().catch(() => undefined),
      ])
      setContracts(cntList)
      setOverview(ov)
      if (cntList.length > 0 && !selectedId) {
        setSelectedId(cntList[0].id)
      }
    } catch (err) {
      setLoadError((err as Error).message || 'Không tải được hợp đồng.')
    } finally {
      setLoading(false)
    }
  }, [loadBuildings, selectedId])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectedContract =
    contracts.find((c) => c.id === selectedId) ?? contracts[0] ?? null
  const lifecycle = selectedContract ? getContractLifecycle(selectedContract) : null

  const usedBuildings = buildings.length || overview?.usage.buildings || 0
  const usedFloors = overview?.usage.floors ?? 0

  async function handleSendRenewal() {
    if (!selectedContract) return
    setSendingRenew(true)
    try {
      await submitContractRenewalRequest(selectedContract.id, renewNote.trim())
      message.success('Đã gửi yêu cầu gia hạn tới Quản trị viên.')
      setRenewOpen(false)
      setRenewNote('')
      await reload()
    } catch (err) {
      message.error((err as Error).message || 'Không gửi được yêu cầu. Vui lòng thử lại.')
    } finally {
      setSendingRenew(false)
    }
  }

  if (loading && !selectedContract) {
    return (
      <div className="adm-page">
        <div
          className="adm-glass-card"
          style={{ padding: 56, textAlign: 'center', color: '#958ea0' }}
        >
          Đang tải hồ sơ hợp đồng dịch vụ...
        </div>
      </div>
    )
  }

  if (loadError && !selectedContract) {
    return (
      <div className="adm-page">
        <div className="adm-glass-card" style={{ padding: 56, textAlign: 'center', color: '#f87171' }}>
          <p style={{ marginTop: 0 }}>Không tải được hợp đồng: {loadError}</p>
          <button type="button" className="adm-btn" onClick={() => void reload()}>
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  if (!selectedContract || !lifecycle) {
    return (
      <div className="adm-page">
        <div
          className="adm-glass-card"
          style={{ padding: 56, textAlign: 'center', color: '#958ea0' }}
        >
          Hiện chưa có hợp đồng dịch vụ nào được ký kết cho tài khoản Chủ tòa nhà của bạn.
        </div>
      </div>
    )
  }

  const usedDays = Math.max(
    1,
    Math.min(lifecycle.totalDays, lifecycle.totalDays - Math.max(0, lifecycle.daysRemaining)),
  )
  const isWarning = lifecycle.status === 'expiring' || lifecycle.status === 'expired'
  const payLabel =
    selectedContract.paymentStatus === 'paid'
      ? 'Đã thanh toán'
      : selectedContract.paymentStatus === 'pending'
        ? 'Chờ thanh toán'
        : 'Thỏa thuận riêng'

  return (
    <div className="adm-page">
      {/* ── 1. TOP ALERT / NOTIFICATION BANNER (Read-only status & Admin contact) ── */}
      <section
        className={`ocp-alert-banner ${!isWarning ? 'ocp-alert-banner--healthy' : ''}`}
      >
        <div className="ocp-alert-banner__bar" />

        <div className="ocp-alert-banner__left">
          <div className="ocp-alert-banner__icon">
            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>
              {isWarning ? 'warning' : 'verified_user'}
            </span>
          </div>

          <div>
            <div className="ocp-alert-banner__title-row">
              <span className="ocp-alert-banner__title">
                {lifecycle.daysRemaining <= 45
                  ? 'Hợp đồng sắp hết hạn!'
                  : 'Hợp đồng đã ký kết với Quản trị viên (Admin)'}
              </span>
              <span className="ocp-alert-banner__tag">
                {lifecycle.daysRemaining <= 45 ? 'Cảnh báo kỳ hạn' : 'Đang hiệu lực'}
              </span>
            </div>

            <p className="ocp-alert-banner__desc">
              Hợp đồng dịch vụ Spatial OS đã ký giữa quý khách và Quản trị viên hiện còn{' '}
              <strong style={{ color: isWarning ? '#fcd34d' : '#6ee7b7' }}>
                {Math.max(0, lifecycle.daysRemaining)} ngày hiệu lực
              </strong>{' '}
              (kết thúc ngày {lifecycle.formattedEndDate}). Đây là bản scan do Quản trị viên tải lên; nếu cần gia hạn hoặc điều chỉnh điều khoản, hãy gửi yêu cầu gia hạn.
            </p>
          </div>
        </div>

        <div className="ocp-alert-banner__actions">
          {selectedContract.renewalRequested ? (
            <span style={{ color: '#fbbf24', fontSize: 13, fontWeight: 600 }}>
              Đã gửi yêu cầu gia hạn, đang chờ Quản trị viên xử lý
            </span>
          ) : (
            <button type="button" className="adm-btn" onClick={() => setRenewOpen(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                autorenew
              </span>
              <span>Gửi yêu cầu gia hạn</span>
            </button>
          )}
        </div>
      </section>

      {/* ── 2. CONTRACT OVERVIEW HEADER CARD ── */}
      <section className="ocp-overview-card">
        {/* Top Row */}
        <div className="ocp-overview-top">
          <div>
            <div className="ocp-code-row">
              <span className="ocp-code-highlight">
                #{selectedContract.contractCode}
              </span>
              <span style={{ color: '#494454' }}>•</span>
              <span className="ocp-mesh-tag">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 16, color: '#34d399' }}
                >
                  verified_user
                </span>
                <span>
                  Không gian định danh: <strong>{selectedContract.workspaceDomain}</strong>
                </span>
              </span>
            </div>

            <h1 className="ocp-contract-title">
              Hợp đồng Cung cấp Dịch vụ Định vị Không gian &amp; Bản đồ 3D
            </h1>

            <div className="ocp-beneficiary-row">
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, color: '#5de6ff' }}
              >
                corporate_fare
              </span>
              <span>
                Bên thụ hưởng:{' '}
                <strong style={{ color: '#ffffff' }}>
                  {selectedContract.customerName}
                </strong>
              </span>
              <span style={{ color: '#958ea0' }}>·</span>
              <span>Đại diện: {selectedContract.representative}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className={`cnt-status-pill cnt-status-pill--${lifecycle.status}`}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'currentColor',
                }}
              />
              {lifecycle.statusLabel}
            </span>

          </div>
        </div>

        {/* Middle Row: Timeline Progress */}
        <div className="ocp-timeline-box">
          <div className="ocp-timeline-header">
            <div className="ocp-timeline-dates">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  calendar_today
                </span>
                <span>
                  Khởi động:{' '}
                  <strong style={{ color: '#ffffff' }}>
                    {lifecycle.formattedStartDate}
                  </strong>
                </span>
              </span>
              <span style={{ color: '#958ea0' }}>→</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  event_busy
                </span>
                <span>
                  Hết hạn:{' '}
                  <strong style={{ color: '#fcd34d' }}>
                    {lifecycle.formattedEndDate}
                  </strong>
                </span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#958ea0',
                }}
              >
                Tiến trình chu kỳ
              </span>
              <span className="cnt-status-pill cnt-status-pill--expiring">
                {lifecycle.daysRemaining >= 0
                  ? `Còn ${lifecycle.daysRemaining} ngày`
                  : 'Đã đáo hạn'}
              </span>
            </div>
          </div>

          <div className="ocp-timeline-bar-track">
            <div
              className="ocp-timeline-bar-fill"
              style={{ width: `${lifecycle.elapsedPercent}%` }}
            />
          </div>

          <div className="ocp-timeline-footer">
            <span>
              Đã sử dụng{' '}
              <strong style={{ color: '#ffffff' }}>
                {usedDays} / {lifecycle.totalDays} ngày
              </strong>{' '}
              ({lifecycle.elapsedPercent}% thời hạn cam kết)
            </span>
            <span style={{ color: '#34d399', fontWeight: 600, fontSize: 12 }}>
              ✓{' '}
              {selectedContract.paymentStatus === 'paid'
                ? 'Đã thanh toán 100% chi phí kỳ hiện tại'
                : 'Đang chờ đối soát thanh toán'}
            </span>
          </div>
        </div>

        {/* Bottom Info Grid: 4 Compact Data Pills */}
        <div className="ocp-pills-grid">
          <div className="ocp-data-pill">
            <div
              className="ocp-data-pill__icon"
              style={{ background: 'rgba(93, 230, 255, 0.14)', color: '#5de6ff' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                payments
              </span>
            </div>
            <div>
              <div className="ocp-data-pill__label">Giá trị hợp đồng</div>
              <div className="ocp-data-pill__value">
                {formatContractValue(selectedContract)}{' '}
                {!selectedContract.billingLabel && '/ năm'}
              </div>
            </div>
          </div>

          <div className="ocp-data-pill">
            <div
              className="ocp-data-pill__icon"
              style={{ background: 'rgba(160, 120, 255, 0.16)', color: '#d0bcff' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                domain
              </span>
            </div>
            <div>
              <div className="ocp-data-pill__label">Hạn mức Tòa nhà &amp; Sàn 3D</div>
              <div className="ocp-data-pill__value">
                {usedBuildings}/{selectedContract.maxBuildings} tòa · {usedFloors}/
                {selectedContract.maxFloors} tầng
              </div>
            </div>
          </div>

          <div className="ocp-data-pill">
            <div
              className="ocp-data-pill__icon"
              style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                handshake
              </span>
            </div>
            <div>
              <div className="ocp-data-pill__label">Thanh toán</div>
              <div className="ocp-data-pill__value">{payLabel}</div>
            </div>
          </div>

          <div className="ocp-data-pill">
            <div
              className="ocp-data-pill__icon"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                verified
              </span>
            </div>
            <div>
              <div className="ocp-data-pill__label">Bản scan</div>
              <div className="ocp-data-pill__value" style={{ color: selectedContract.hasScan ? '#6ee7b7' : '#f87171' }}>
                {selectedContract.hasScan ? `${selectedContract.pageCount} tệp` : 'Chưa có'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. LARGE DOCUMENT VIEWER ("Bản scan hợp đồng") ── */}
      <section>
        <ContractScanViewer contract={selectedContract} loadDetail={getOwnerContract} large />
      </section>

      {/* ── 4. BOTTOM INFO CARDS (Thời hạn & Pháp lý + Ghi chú từ Quản trị viên) ── */}
      <section className="ocp-bottom-grid">
        {/* Left Column: Thời hạn & Pháp lý */}
        <div className="ocp-info-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ocp-info-card__header">
              <div className="ocp-info-card__title-row">
                <div
                  className="ocp-data-pill__icon"
                  style={{
                    width: 34,
                    height: 34,
                    background: 'rgba(93, 230, 255, 0.14)',
                    color: '#5de6ff',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    gavel
                  </span>
                </div>
                <h2 className="ocp-info-card__title">Thời hạn &amp; Pháp lý</h2>
              </div>
            </div>

            <div className="ocp-legal-cells">
              <div className="ocp-legal-cell">
                <span className="cnt-info-label">Ngày bắt đầu</span>
                <span className="cnt-info-value">
                  {lifecycle.formattedStartDate}
                </span>
              </div>
              <div className="ocp-legal-cell">
                <span className="cnt-info-label">Thời hạn hợp đồng</span>
                <span className="cnt-info-value" style={{ color: '#34d399' }}>
                  {lifecycle.durationMonths} tháng
                </span>
              </div>
              <div className="ocp-legal-cell">
                <span className="cnt-info-label">Ngày kết thúc</span>
                <span className="cnt-info-value" style={{ color: '#fcd34d' }}>
                  {lifecycle.formattedEndDate}
                </span>
              </div>
              <div className="ocp-legal-cell">
                <span className="cnt-info-label">Tình trạng thanh toán</span>
                <span className="cnt-info-value">{payLabel}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
            <span className="cnt-info-label">
              Tài nguyên &amp; Tòa nhà liên kết ({usedBuildings} /{' '}
              {selectedContract.maxBuildings} tòa nhà)
            </span>
            <div className="ocp-building-chips">
              {buildings.length > 0 ? (
                buildings.map((b) => (
                  <Link
                    key={b.id}
                    to={`/owner/buildings/${b.id}`}
                    className="ocp-building-chip"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: 16, color: '#5de6ff' }}
                    >
                      apartment
                    </span>
                    <span>
                      {b.name} ({b.floorCount} tầng)
                    </span>
                  </Link>
                ))
              ) : (
                <Link to="/owner/buildings" className="ocp-building-chip">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 16, color: '#5de6ff' }}
                  >
                    apartment
                  </span>
                  <span>Xem danh sách tòa nhà của tôi</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Ghi chú từ quản trị viên SpotWay */}
        <div className="ocp-info-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ocp-info-card__header">
              <div className="ocp-info-card__title-row">
                <div
                  className="ocp-data-pill__icon"
                  style={{
                    width: 34,
                    height: 34,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    verified
                  </span>
                </div>
                <h2 className="ocp-info-card__title">
                  Ghi chú từ quản trị viên SpotWay
                </h2>
              </div>
              <span style={{ fontSize: 11, color: '#958ea0', fontWeight: 600 }}>
                Do Quản trị viên nhập
              </span>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 14,
                background: 'rgba(18, 18, 34, 0.72)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, color: '#5de6ff', marginTop: 2 }}
                >
                  info
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13.5,
                    lineHeight: 1.6,
                    color: '#cbc3d7',
                  }}
                >
                  {selectedContract.notes || 'Quản trị viên chưa để ghi chú cho hợp đồng này.'}
                </p>
              </div>

            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              paddingTop: 6,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: '#958ea0',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16, color: '#fbbf24' }}
              >
                schedule
              </span>
              <span>
                Hợp đồng được Admin lưu trữ và đồng bộ trực tiếp vào hồ sơ Chủ tòa nhà.
              </span>
            </span>

            {contracts.length > 1 && (
              <button
                type="button"
                className="adm-btn adm-btn--sm"
                style={{
                  background: 'rgba(93, 230, 255, 0.12)',
                  borderColor: 'rgba(93, 230, 255, 0.3)',
                  color: '#5de6ff',
                }}
                onClick={() => setHistoryModalOpen(true)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  history_edu
                </span>
                <span>Xem các hợp đồng đã ký ({contracts.length})</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── MODAL: Gửi yêu cầu gia hạn tới Quản trị viên ── */}
      {renewOpen && (
        <div
          className="adm-modal-backdrop"
          onClick={() => !sendingRenew && setRenewOpen(false)}
          role="presentation"
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="adm-modal__header">
              <div className="adm-modal__header-left">
                <div className="adm-modal__icon">
                  <span className="material-symbols-outlined">autorenew</span>
                </div>
                <div>
                  <h2 className="adm-modal__title">Yêu cầu gia hạn hợp đồng</h2>
                  <p className="adm-modal__subtitle">
                    Hợp đồng #{selectedContract.contractCode} · hết hạn {lifecycle.formattedEndDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="adm-modal__close"
                onClick={() => setRenewOpen(false)}
                disabled={sendingRenew}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="adm-modal__body" style={{ gap: 12 }}>
              <label className="cnt-info-label" htmlFor="renew-note">
                Nội dung gửi Quản trị viên (không bắt buộc)
              </label>
              <textarea
                id="renew-note"
                className="adm-input"
                rows={4}
                maxLength={500}
                placeholder="Ví dụ: Muốn gia hạn thêm 12 tháng và tăng hạn mức lên 5 tòa nhà."
                value={renewNote}
                onChange={(e) => setRenewNote(e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <div className="adm-modal__footer">
                <button type="button" className="adm-btn" onClick={() => setRenewOpen(false)} disabled={sendingRenew}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn--primary"
                  onClick={() => void handleSendRenewal()}
                  disabled={sendingRenew}
                >
                  {sendingRenew ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Xem danh sách hợp đồng đã ký (nếu có nhiều hợp đồng) ── */}
      {historyModalOpen && (
        <div
          className="adm-modal-backdrop"
          onClick={() => setHistoryModalOpen(false)}
          role="presentation"
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 540 }}
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
                  <h2 className="adm-modal__title">Hợp đồng đã ký với Admin</h2>
                  <p className="adm-modal__subtitle">
                    Chọn một hợp đồng để xem bản scan chi tiết
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="adm-modal__close"
                onClick={() => setHistoryModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="adm-modal__body" style={{ gap: 10 }}>
              {contracts.map((c) => {
                const lf = getContractLifecycle(c)
                return (
                  <div
                    key={c.id}
                    className="ocp-legal-cell"
                    style={{
                      cursor: 'pointer',
                      borderColor:
                        c.id === selectedContract.id
                          ? 'rgba(93, 230, 255, 0.5)'
                          : undefined,
                    }}
                    onClick={() => {
                      setSelectedId(c.id)
                      setHistoryModalOpen(false)
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <strong style={{ color: '#5de6ff', fontSize: 14 }}>
                        #{c.contractCode} — {formatContractValue(c)}
                      </strong>
                      <span className={`cnt-status-pill cnt-status-pill--${lf.status}`}>
                        {lf.statusLabel}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#958ea0' }}>
                      Thời hạn: {lf.formattedStartDate} – {lf.formattedEndDate}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerContractsPage
