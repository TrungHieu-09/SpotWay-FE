import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as AntApp, Popconfirm } from 'antd'
import {
  createAdminContract,
  deleteAdminContract,
  getAdminContracts,
  updateAdminContract,
} from '../../api/contracts'
import { getAdminUsers } from '../../api/admin'
import { ContractScanViewer } from '../../components/contracts/ContractScanViewer'
import type { AdminUser } from '../../types/admin'
import type {
  ContractCurrency,
  ContractLifecycleStatus,
  ContractPaymentStatus,
  ServiceContract,
} from '../../types/contract'
import {
  formatContractValue,
  formatDateVN,
  getContractLifecycle,
} from '../../types/contract'
import './AdminPages.css'
import './ContractsPage.css'

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}${parts[2]?.[0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 3).toUpperCase() || 'OWN'
}

function nextContractCode(existing: ServiceContract[]): string {
  const year = new Date().getFullYear()
  const maxNum = existing.reduce((max, c) => {
    const match = c.contractCode.match(/(\d+)$/)
    const n = match ? parseInt(match[1], 10) : 0
    return n > max && n < 900 ? n : max
  }, 0)
  return `HD-${year}-${String(maxNum + 1).padStart(3, '0')}`
}

export function AdminContractsPage() {
  const { message } = AntApp.useApp()
  const [contracts, setContracts] = useState<ServiceContract[]>([])
  const [owners, setOwners] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | ContractLifecycleStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortAsc, setSortAsc] = useState(false)

  // Create / Edit Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formCode, setFormCode] = useState('')
  const [formOwnerId, setFormOwnerId] = useState('')
  const [formCustomerName, setFormCustomerName] = useState('')
  const [formOwnerEmail, setFormOwnerEmail] = useState('')
  const [formRepresentative, setFormRepresentative] = useState('')
  const [formDomain, setFormDomain] = useState('')
  const [formStartDate, setFormStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [formEndDate, setFormEndDate] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [formValue, setFormValue] = useState('24000')
  const [formCurrency, setFormCurrency] = useState<ContractCurrency>('USD')
  const [formPaymentStatus, setFormPaymentStatus] = useState<ContractPaymentStatus>('paid')
  const [formMaxBuildings, setFormMaxBuildings] = useState('3')
  const [formMaxFloors, setFormMaxFloors] = useState('15')
  const [formPageCount, setFormPageCount] = useState('3')
  const [formScanFileName, setFormScanFileName] = useState('')
  const [formScanDataUrl, setFormScanDataUrl] = useState<string | null>(null)
  const [formNotes, setFormNotes] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [cntList, userList] = await Promise.all([
        getAdminContracts(),
        getAdminUsers().catch(() => [] as AdminUser[]),
      ])
      setContracts(cntList)
      setOwners(userList.filter((u) => u.role === 'building_owner'))
      if (cntList.length > 0 && !selectedId) {
        setSelectedId(cntList[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    void reload()
  }, [reload])

  const counts = useMemo(() => {
    let active = 0
    let expiring = 0
    let expired = 0
    for (const c of contracts) {
      const st = getContractLifecycle(c).status
      if (st === 'active') active++
      else if (st === 'expiring') expiring++
      else expired++
    }
    return { total: contracts.length, active, expiring, expired }
  }, [contracts])

  const filteredContracts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = contracts.filter((c) => {
      const st = getContractLifecycle(c).status
      if (statusFilter !== 'all' && st !== statusFilter) return false
      if (q) {
        const hay = `${c.contractCode} ${c.customerName} ${c.ownerEmail} ${c.representative} ${c.workspaceDomain}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    return [...list].sort((a, b) => {
      const da = getContractLifecycle(a).daysRemaining
      const db = getContractLifecycle(b).daysRemaining
      return sortAsc ? da - db : db - da
    })
  }, [contracts, statusFilter, searchQuery, sortAsc])

  const selectedContract = useMemo(() => {
    return (
      filteredContracts.find((c) => c.id === selectedId) ??
      contracts.find((c) => c.id === selectedId) ??
      filteredContracts[0] ??
      contracts[0] ??
      null
    )
  }, [contracts, filteredContracts, selectedId])

  function openCreateModal() {
    setEditingId(null)
    setFormCode(nextContractCode(contracts))
    const defaultOwner = owners[0]
    setFormOwnerId(defaultOwner?.id ?? '')
    setFormCustomerName(
      defaultOwner?.tenantName || defaultOwner?.name || 'Tổ hợp Tòa nhà Doanh nghiệp',
    )
    setFormOwnerEmail(defaultOwner?.email || '')
    setFormRepresentative(
      defaultOwner ? `${defaultOwner.name} (Chủ tòa nhà)` : 'Đại diện Chủ tòa nhà',
    )
    setFormDomain(
      defaultOwner
        ? `${(defaultOwner.tenantName || defaultOwner.name || 'workspace')
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')}.spotway.app`
        : 'enterprise.spotway.app',
    )
    const today = new Date().toISOString().slice(0, 10)
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    setFormStartDate(today)
    setFormEndDate(nextYear.toISOString().slice(0, 10))
    setFormValue('24000')
    setFormCurrency('USD')
    setFormPaymentStatus('paid')
    setFormMaxBuildings('3')
    setFormMaxFloors('15')
    setFormPageCount('3')
    setFormScanFileName('')
    setFormScanDataUrl(null)
    setFormNotes(
      'Hợp đồng cấp quyền quản trị tòa nhà, số hóa bản đồ 3D và dẫn đường thông minh giữa Admin và Chủ tòa nhà.',
    )
    setModalOpen(true)
  }

  function openEditModal(c: ServiceContract) {
    setEditingId(c.id)
    setFormCode(c.contractCode)
    setFormOwnerId(c.ownerId ?? '')
    setFormCustomerName(c.customerName)
    setFormOwnerEmail(c.ownerEmail)
    setFormRepresentative(c.representative)
    setFormDomain(c.workspaceDomain)
    setFormStartDate(c.startDate)
    setFormEndDate(c.endDate)
    setFormValue(String(c.annualValue))
    setFormCurrency(c.currency)
    setFormPaymentStatus(c.paymentStatus)
    setFormMaxBuildings(String(c.maxBuildings))
    setFormMaxFloors(String(c.maxFloors))
    setFormPageCount(String(c.pageCount))
    setFormScanFileName(c.scanFileName ?? '')
    setFormScanDataUrl(c.scanDataUrl ?? null)
    setFormNotes(c.notes)
    setModalOpen(true)
  }

  function handleSelectOwner(ownerId: string) {
    setFormOwnerId(ownerId)
    const found = owners.find((o) => o.id === ownerId)
    if (found) {
      setFormOwnerEmail(found.email)
      setFormCustomerName(found.tenantName || found.name || found.email.split('@')[0])
      setFormRepresentative(`${found.name || found.email.split('@')[0]} (Chủ tòa nhà)`)
      setFormDomain(
        `${(found.tenantName || found.name || 'workspace')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')}.spotway.app`,
      )
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFormScanFileName(file.name)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormScanDataUrl(reader.result)
        }
      }
      reader.readAsDataURL(file)
    } else {
      setFormScanDataUrl(null)
    }
  }

  async function handleSaveContract(e: React.FormEvent) {
    e.preventDefault()
    if (!formCustomerName.trim() || !formOwnerEmail.trim()) {
      message.error('Vui lòng nhập tên Chủ tòa nhà / Khách hàng và Email.')
      return
    }
    setSaving(true)
    try {
      const matchedOwner = owners.find(
        (o) =>
          o.id === formOwnerId ||
          o.email.toLowerCase() === formOwnerEmail.trim().toLowerCase(),
      )
      const payload = {
        contractCode: formCode.trim() || nextContractCode(contracts),
        ownerId: matchedOwner?.id ?? (formOwnerId || null),
        tenantId: matchedOwner?.tenantId ?? null,
        customerName: formCustomerName.trim(),
        ownerEmail: formOwnerEmail.trim(),
        representative: formRepresentative.trim() || formCustomerName.trim(),
        workspaceDomain: formDomain.trim() || 'workspace.spotway.app',
        startDate: formStartDate,
        endDate: formEndDate,
        annualValue: Number(formValue) || 0,
        currency: formCurrency,
        billingLabel: null,
        paymentStatus: formPaymentStatus,
        maxBuildings: Math.max(1, Number(formMaxBuildings) || 3),
        maxFloors: Math.max(1, Number(formMaxFloors) || 15),
        pageCount: Math.max(1, Number(formPageCount) || 3),
        scanFileName: formScanFileName.trim() || `${formCode.trim()}-Signed.pdf`,
        scanDataUrl: formScanDataUrl,
        notes: formNotes.trim(),
      }

      if (editingId) {
        const updated = await updateAdminContract(editingId, payload)
        setContracts((prev) => prev.map((c) => (c.id === editingId ? updated : c)))
        message.success(`Đã cập nhật hợp đồng ${updated.contractCode}!`)
      } else {
        const created = await createAdminContract(payload)
        setContracts((prev) => [created, ...prev])
        setSelectedId(created.id)
        message.success(`Đã tạo và lưu trữ hợp đồng ${created.contractCode} cho Chủ tòa nhà!`)
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickRenew(c: ServiceContract) {
    const currentEnd = new Date(c.endDate)
    const baseDate = currentEnd.getTime() > Date.now() ? currentEnd : new Date()
    baseDate.setFullYear(baseDate.getFullYear() + 1)
    const nextEndDate = baseDate.toISOString().slice(0, 10)

    const updated = await updateAdminContract(c.id, {
      endDate: nextEndDate,
      renewalRequested: false,
      renewalNote: null,
    })
    setContracts((prev) => prev.map((item) => (item.id === c.id ? updated : item)))
    message.success(
      `Đã gia hạn hợp đồng ${c.contractCode} đến ngày ${formatDateVN(nextEndDate)}!`,
    )
  }

  async function handleDeleteContract(id: string) {
    await deleteAdminContract(id)
    const remaining = contracts.filter((c) => c.id !== id)
    setContracts(remaining)
    if (selectedId === id && remaining.length > 0) {
      setSelectedId(remaining[0].id)
    }
    message.success('Đã xóa hồ sơ hợp đồng.')
  }

  return (
    <div className="adm-page">
      {/* ── Page Header (Synchronized with AdminAccountsPage) ── */}
      <header className="adm-hero">
        <div>
          <div className="adm-hero__eyebrow">
            <span className="adm-hero__eyebrow-dot" />
            <span>QUẢN TRỊ HỆ THỐNG</span>
          </div>
          <div className="adm-hero__title-row">
            <h1 className="adm-hero__title">Hợp đồng</h1>
            <span className="adm-count-pill">{contracts.length} hợp đồng</span>
          </div>
          <p className="adm-hero__subtitle">
            Kho lưu trữ và quản lý hợp đồng dịch vụ cấp quyền hạ tầng không gian 3D giữa Admin và
            Chủ tòa nhà.
          </p>
        </div>

        <div className="adm-hero__actions">
          <button
            type="button"
            className="adm-btn"
            onClick={() => {
              fileInputRef.current?.click()
              openCreateModal()
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              upload_file
            </span>
            <span>+ Nhập bản scan</span>
          </button>

          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={openCreateModal}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              add_circle
            </span>
            <span>+ Tải hợp đồng lên</span>
          </button>
        </div>
      </header>

      {/* ── 3 Horizontal KPI Stat Cards ── */}
      <section className="cnt-stat-grid" aria-label="Thống kê hợp đồng">
        {/* Card 1: Đang hiệu lực */}
        <div
          className={`adm-glass-card cnt-stat-card ${
            statusFilter === 'active' ? 'adm-stat-card--selected' : ''
          }`}
          onClick={() => setStatusFilter((s) => (s === 'active' ? 'all' : 'active'))}
          role="button"
          tabIndex={0}
        >
          <div
            className="cnt-stat-card__glow"
            style={{ background: 'rgba(16, 185, 129, 0.16)' }}
          />
          <div className="cnt-stat-card__info">
            <span className="cnt-stat-card__label">Đang hiệu lực</span>
            <span className="cnt-stat-card__value" style={{ color: '#10b981' }}>
              {String(counts.active).padStart(2, '0')}
            </span>
            <span className="cnt-stat-card__sub">Hợp đồng trong hạn cam kết</span>
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

        {/* Card 2: Sắp hết hạn */}
        <div
          className={`adm-glass-card cnt-stat-card ${
            statusFilter === 'expiring' ? 'adm-stat-card--selected' : ''
          }`}
          onClick={() => setStatusFilter((s) => (s === 'expiring' ? 'all' : 'expiring'))}
          role="button"
          tabIndex={0}
        >
          <div
            className="cnt-stat-card__glow"
            style={{ background: 'rgba(245, 158, 11, 0.16)' }}
          />
          <div className="cnt-stat-card__info">
            <span className="cnt-stat-card__label">Sắp hết hạn</span>
            <span className="cnt-stat-card__value" style={{ color: '#f59e0b' }}>
              {String(counts.expiring).padStart(2, '0')}
            </span>
            <span className="cnt-stat-card__sub">Cần gia hạn trong &lt; 45 ngày</span>
          </div>
          <div
            className="cnt-stat-card__icon"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 30 }}>
              notification_important
            </span>
          </div>
        </div>

        {/* Card 3: Hết hạn */}
        <div
          className={`adm-glass-card cnt-stat-card ${
            statusFilter === 'expired' ? 'adm-stat-card--selected' : ''
          }`}
          onClick={() => setStatusFilter((s) => (s === 'expired' ? 'all' : 'expired'))}
          role="button"
          tabIndex={0}
        >
          <div
            className="cnt-stat-card__glow"
            style={{ background: 'rgba(239, 68, 68, 0.16)' }}
          />
          <div className="cnt-stat-card__info">
            <span className="cnt-stat-card__label">Hết hạn</span>
            <span className="cnt-stat-card__value" style={{ color: '#ef4444' }}>
              {String(counts.expired).padStart(2, '0')}
            </span>
            <span className="cnt-stat-card__sub">Hết hiệu lực pháp lý</span>
          </div>
          <div
            className="cnt-stat-card__icon"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 30 }}>
              inventory_2
            </span>
          </div>
        </div>
      </section>

      {/* ── Filter & Search Toolbar ── */}
      <section className="adm-glass-card cnt-toolbar">
        <div className="cnt-chips">
          <button
            type="button"
            className={`cnt-chip ${statusFilter === 'all' ? 'cnt-chip--active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            <span>Tất cả</span>
            <span className="cnt-chip__count">{counts.total}</span>
          </button>

          <button
            type="button"
            className={`cnt-chip ${statusFilter === 'active' ? 'cnt-chip--active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            <span className="cnt-chip__dot" style={{ background: '#10b981' }} />
            <span>Đang hiệu lực</span>
            <span className="cnt-chip__count">{counts.active}</span>
          </button>

          <button
            type="button"
            className={`cnt-chip ${statusFilter === 'expiring' ? 'cnt-chip--active' : ''}`}
            onClick={() => setStatusFilter('expiring')}
          >
            <span className="cnt-chip__dot" style={{ background: '#f59e0b' }} />
            <span>Sắp hết hạn</span>
            <span className="cnt-chip__count">{counts.expiring}</span>
          </button>

          <button
            type="button"
            className={`cnt-chip ${statusFilter === 'expired' ? 'cnt-chip--active' : ''}`}
            onClick={() => setStatusFilter('expired')}
          >
            <span className="cnt-chip__dot" style={{ background: '#ef4444' }} />
            <span>Hết hạn</span>
            <span className="cnt-chip__count">{counts.expired}</span>
          </button>
        </div>

        <div className="cnt-search-actions">
          <div className="cnt-search-box">
            <span className="material-symbols-outlined cnt-search-box__icon">search</span>
            <input
              type="text"
              className="cnt-search-input"
              placeholder="Tìm số hợp đồng, tên chủ tòa nhà..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="adm-btn adm-btn--sm"
            onClick={() => setSortAsc((v) => !v)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              sort
            </span>
            <span>{sortAsc ? 'Hạn gần nhất' : 'Hạn xa nhất'}</span>
          </button>
        </div>
      </section>

      {/* ── Main Content Grid (Left Table + Right Detail & Scan Viewer Drawer) ── */}
      <div className="cnt-split-grid">
        {/* Left Column: Contracts Table */}
        <div className="adm-glass-card" style={{ overflow: 'hidden' }}>
          <div className="cnt-table-wrap">
            <table className="cnt-table">
              <thead>
                <tr>
                  <th>Số hợp đồng</th>
                  <th>Chủ tòa nhà / Khách hàng</th>
                  <th>Thời hạn</th>
                  <th>Giá trị &amp; Hạn mức</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Bản scan</th>
                </tr>
              </thead>
              <tbody>
                {loading && contracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: '#958ea0' }}>
                      Đang tải danh sách hợp đồng...
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: '#958ea0' }}>
                      Không tìm thấy hợp đồng nào khớp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((c) => {
                    const isSelected = selectedContract?.id === c.id
                    const lf = getContractLifecycle(c)
                    return (
                      <tr
                        key={c.id}
                        className={`cnt-row ${isSelected ? 'cnt-row--selected' : ''}`}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <td>
                          <div className="cnt-code-cell">
                            <span className="cnt-code-text">{c.contractCode}</span>
                            {isSelected && (
                              <span className="cnt-selected-badge">Đang chọn</span>
                            )}
                            {c.renewalRequested && (
                              <span
                                className="cnt-selected-badge"
                                style={{ background: '#fbbf24', color: '#451a03' }}
                              >
                                Xin gia hạn
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="cnt-customer-cell">
                            <div className="cnt-customer-avatar">
                              {getInitials(c.customerName)}
                            </div>
                            <div>
                              <div className="cnt-customer-name">{c.customerName}</div>
                              <div className="cnt-customer-sub">
                                {c.ownerEmail} · {c.workspaceDomain}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="cnt-duration-cell">
                            <span style={{ fontSize: 11.5, color: '#e3e0f6' }}>
                              {lf.formattedStartDate} – {lf.formattedEndDate}
                            </span>
                            <div className="cnt-progress-track">
                              <div
                                className="cnt-progress-fill"
                                style={{
                                  width: `${lf.elapsedPercent}%`,
                                  background:
                                    lf.status === 'expired'
                                      ? '#ef4444'
                                      : lf.status === 'expiring'
                                        ? '#f59e0b'
                                        : 'linear-gradient(90deg, #5de6ff, #a078ff)',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                color:
                                  lf.status === 'expired'
                                    ? '#f87171'
                                    : lf.status === 'expiring'
                                      ? '#fbbf24'
                                      : '#5de6ff',
                              }}
                            >
                              {lf.daysRemaining >= 0
                                ? `Còn ${lf.daysRemaining.toLocaleString('vi-VN')} ngày`
                                : `Quá hạn ${Math.abs(lf.daysRemaining)} ngày`}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: '#ffffff' }}>
                            {formatContractValue(c)}{' '}
                            {!c.billingLabel && (
                              <span style={{ fontWeight: 400, fontSize: 11, color: '#958ea0' }}>
                                /năm
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: '#958ea0' }}>
                            {c.maxBuildings} tòa nhà · {c.maxFloors} tầng 3D
                          </div>
                        </td>

                        <td>
                          <span className={`cnt-status-pill cnt-status-pill--${lf.status}`}>
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'currentColor',
                              }}
                            />
                            {lf.statusLabel}
                          </span>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span className="cnt-scan-chip">
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 15, color: '#f472b6' }}
                            >
                              picture_as_pdf
                            </span>
                            <span>{c.pageCount} trang</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(20, 20, 36, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12.5,
              color: '#958ea0',
            }}
          >
            <span>
              Hiển thị 1 - {filteredContracts.length} của {contracts.length} hợp đồng
            </span>
            <span>Bấm vào một dòng để xem chi tiết &amp; bản scan hợp đồng</span>
          </div>
        </div>

        {/* Right Column: Contract Detail & Scanned Document Drawer */}
        {selectedContract && (
          <div className="adm-glass-card cnt-drawer">
            {/* Drawer Header */}
            <div className="cnt-drawer__header">
              <div className="cnt-drawer__title-wrap">
                <div className="cnt-drawer__icon">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                    contract
                  </span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="cnt-drawer__code">
                      #{selectedContract.contractCode}
                    </span>
                    <span
                      className={`cnt-status-pill cnt-status-pill--${
                        getContractLifecycle(selectedContract).status
                      }`}
                    >
                      {getContractLifecycle(selectedContract).statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#958ea0', marginTop: 2 }}>
                    Ký kết ngày {formatDateVN(selectedContract.startDate)} · Hồ sơ pháp lý giữa
                    Admin &amp; Chủ tòa nhà
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="adm-btn adm-btn--sm"
                onClick={() => handleQuickRenew(selectedContract)}
                title="Gia hạn hợp đồng thêm 12 tháng"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  autorenew
                </span>
                <span>Gia hạn +1 năm</span>
              </button>
            </div>

            {/* Renewal Request Alert from Building Owner if present */}
            {selectedContract.renewalRequested && (
              <div className="cnt-renewal-alert">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    notifications_active
                  </span>
                  <div>
                    <strong>Yêu cầu từ Chủ tòa nhà:</strong>{' '}
                    {selectedContract.renewalNote ||
                      'Đề nghị gia hạn hợp đồng thêm 12 tháng.'}
                  </div>
                </div>
                <button
                  type="button"
                  className="adm-btn adm-btn--sm adm-btn--primary"
                  onClick={() => handleQuickRenew(selectedContract)}
                >
                  Duyệt gia hạn
                </button>
              </div>
            )}

            {/* Compact Info List */}
            <div className="cnt-info-grid">
              <div className="cnt-info-item">
                <span className="cnt-info-label">Chủ tòa nhà / Khách hàng</span>
                <span className="cnt-info-value" style={{ color: '#5de6ff' }}>
                  {selectedContract.customerName}
                </span>
                <span className="cnt-info-sub">
                  Đại diện: {selectedContract.representative} ({selectedContract.ownerEmail})
                </span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Giá trị hợp đồng &amp; Hạn mức</span>
                <span className="cnt-info-value">
                  {formatContractValue(selectedContract)}{' '}
                  {!selectedContract.billingLabel && (
                    <span style={{ fontSize: 12, fontWeight: 400, color: '#958ea0' }}>
                      / năm
                    </span>
                  )}
                </span>
                <span
                  className="cnt-info-sub"
                  style={{ color: '#10b981', fontWeight: 600 }}
                >
                  ✓ Tối đa {selectedContract.maxBuildings} tòa nhà ·{' '}
                  {selectedContract.maxFloors} mặt sàn 3D
                </span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Ngày bắt đầu</span>
                <span className="cnt-info-value">
                  {formatDateVN(selectedContract.startDate)}
                </span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Ngày kết thúc</span>
                <span className="cnt-info-value">
                  {formatDateVN(selectedContract.endDate)}{' '}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#958ea0' }}>
                    ({getContractLifecycle(selectedContract).durationMonths} tháng)
                  </span>
                </span>
              </div>

              <div className="cnt-note-box">
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 18, color: '#f472b6', marginTop: 1 }}
                >
                  sticky_note_2
                </span>
                <div>
                  <strong style={{ color: '#ffffff' }}>Ghi chú lưu trữ: </strong>
                  <span>“{selectedContract.notes}”</span>
                </div>
              </div>
            </div>

            {/* Scanned Contract Document Viewer */}
            <ContractScanViewer contract={selectedContract} />

            {/* Sticky Footer Actions */}
            <div className="cnt-drawer__footer">
              <button
                type="button"
                className="adm-btn adm-btn--primary"
                style={{ flex: 1 }}
                onClick={() => openEditModal(selectedContract)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  edit_document
                </span>
                <span>Chỉnh sửa hợp đồng</span>
              </button>

              <Popconfirm
                title="Xóa hồ sơ hợp đồng này?"
                description={`Bạn có chắc muốn xóa hợp đồng ${selectedContract.contractCode}?`}
                okText="Xóa hợp đồng"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeleteContract(selectedContract.id)}
              >
                <button type="button" className="adm-btn adm-btn--danger">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    delete_sweep
                  </span>
                  <span>Xóa hợp đồng</span>
                </button>
              </Popconfirm>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Contract Modal ── */}
      {modalOpen && (
        <div
          className="adm-modal-backdrop"
          onClick={() => !saving && setModalOpen(false)}
          role="presentation"
        >
          <div
            className="adm-modal"
            style={{ maxWidth: 660 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="adm-modal__header">
              <div className="adm-modal__header-left">
                <div className="adm-modal__icon">
                  <span className="material-symbols-outlined">contract</span>
                </div>
                <div>
                  <h2 className="adm-modal__title">
                    {editingId ? 'Chỉnh sửa Hợp đồng dịch vụ' : 'Tạo & Tải Hợp đồng mới'}
                  </h2>
                  <p className="adm-modal__subtitle">
                    Ký kết và cấp hạn mức tòa nhà 3D giữa Admin và Chủ tòa nhà
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="adm-modal__close"
                onClick={() => setModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="adm-modal__body">
              {/* Select existing Building Owner */}
              {owners.length > 0 && (
                <div className="adm-field">
                  <label className="adm-field__label">
                    Chọn tài khoản Chủ tòa nhà trong hệ thống
                  </label>
                  <select
                    className="adm-input"
                    value={formOwnerId}
                    onChange={(e) => handleSelectOwner(e.target.value)}
                  >
                    <option value="">-- Nhập thông tin Chủ tòa nhà mới hoặc chọn bên dưới --</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.email}) {o.tenantName ? `— ${o.tenantName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.5fr',
                  gap: 14,
                }}
              >
                <div className="adm-field">
                  <label className="adm-field__label">Số hợp đồng *</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="HD-2026-001"
                    required
                  />
                </div>

                <div className="adm-field">
                  <label className="adm-field__label">
                    Tên Chủ tòa nhà / Tổ hợp Doanh nghiệp *
                  </label>
                  <input
                    type="text"
                    className="adm-input"
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    placeholder="VD: Metro Transit Authority"
                    required
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                }}
              >
                <div className="adm-field">
                  <label className="adm-field__label">Email tài khoản Chủ tòa nhà *</label>
                  <input
                    type="email"
                    className="adm-input"
                    value={formOwnerEmail}
                    onChange={(e) => setFormOwnerEmail(e.target.value)}
                    placeholder="owner@company.com"
                    required
                  />
                </div>

                <div className="adm-field">
                  <label className="adm-field__label">Người đại diện pháp lý</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={formRepresentative}
                    onChange={(e) => setFormRepresentative(e.target.value)}
                    placeholder="VD: Nguyễn Văn A (Giám đốc)"
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                }}
              >
                <div className="adm-field">
                  <label className="adm-field__label">Ngày bắt đầu hiệu lực</label>
                  <input
                    type="date"
                    className="adm-input"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>

                <div className="adm-field">
                  <label className="adm-field__label">Ngày kết thúc</label>
                  <input
                    type="date"
                    className="adm-input"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 0.8fr 1fr 1fr',
                  gap: 12,
                }}
              >
                <div className="adm-field">
                  <label className="adm-field__label">Giá trị / năm</label>
                  <input
                    type="number"
                    className="adm-input"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                  />
                </div>

                <div className="adm-field">
                  <label className="adm-field__label">Tiền tệ</label>
                  <select
                    className="adm-input"
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value as ContractCurrency)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="VND">VNĐ (₫)</option>
                  </select>
                </div>

                <div className="adm-field">
                  <label className="adm-field__label">Số tòa nhà tối đa</label>
                  <input
                    type="number"
                    className="adm-input"
                    min={1}
                    value={formMaxBuildings}
                    onChange={(e) => setFormMaxBuildings(e.target.value)}
                  />
                </div>

                <div className="adm-field">
                  <label className="adm-field__label">Số tầng 3D tối đa</label>
                  <input
                    type="number"
                    className="adm-input"
                    min={1}
                    value={formMaxFloors}
                    onChange={(e) => setFormMaxFloors(e.target.value)}
                  />
                </div>
              </div>

              {/* Scan File Upload */}
              <div className="adm-field">
                <label className="adm-field__label">
                  Đính kèm bản scan hợp đồng (PDF hoặc Ảnh scan đã đóng dấu)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    className="adm-btn adm-btn--sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      attach_file
                    </span>
                    <span>Chọn tệp scan từ máy tính</span>
                  </button>
                  <span style={{ fontSize: 12, color: '#5de6ff' }}>
                    {formScanFileName || 'Sử dụng mẫu hợp đồng điện tử có dấu chứng thực SpotWay'}
                  </span>
                </div>
              </div>

              <div className="adm-field">
                <label className="adm-field__label">Ghi chú lưu trữ &amp; Điều khoản riêng</label>
                <textarea
                  className="adm-input"
                  style={{ minHeight: 68, paddingTop: 10, resize: 'vertical' }}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú phạm vi triển khai, nơi lưu bản cứng..."
                />
              </div>

              <div className="adm-modal__footer">
                <button
                  type="button"
                  className="adm-btn"
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn--primary"
                  disabled={saving}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    verified
                  </span>
                  <span>
                    {saving
                      ? 'Đang lưu hợp đồng...'
                      : editingId
                        ? 'Lưu thay đổi'
                        : 'Xác nhận & Lưu hợp đồng'}
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

export default AdminContractsPage

