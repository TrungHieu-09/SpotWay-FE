import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App as AntApp, Popconfirm } from 'antd'
import { useNavigate } from 'react-router-dom'
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

interface ScanPageFileItem {
  id: string
  fileName: string
  sizeText: string
  statusText: string
  iconName: 'check_circle' | 'verified_user'
  iconColor: string
  dataUrl?: string | null
}

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

function buildDefaultScanPages(codeSlug: string): ScanPageFileItem[] {
  const slug = codeSlug.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'mta'
  return [
    {
      id: 'p-1',
      fileName: `hop_dong_${slug}_trang1.pdf`,
      sizeText: '1.8 MB',
      statusText: 'Hoàn tất 100%',
      iconName: 'check_circle',
      iconColor: '#5de6ff',
    },
    {
      id: 'p-2',
      fileName: `hop_dong_${slug}_trang2.pdf`,
      sizeText: '1.4 MB',
      statusText: 'Hoàn tất 100%',
      iconName: 'check_circle',
      iconColor: '#5de6ff',
    },
    {
      id: 'p-3',
      fileName: `phu_luc_ky_ten_${slug}.png`,
      sizeText: '2.1 MB · Ký tên & Con dấu',
      statusText: 'Hợp lệ',
      iconName: 'verified_user',
      iconColor: '#f8acff',
    },
  ]
}

export function AdminContractsPage() {
  const { message } = AntApp.useApp()
  const navigate = useNavigate()
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
  const [isDragging, setIsDragging] = useState(false)
  const [notifyOwner, setNotifyOwner] = useState(true)

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
  const [formScanPages, setFormScanPages] = useState<ScanPageFileItem[]>(() =>
    buildDefaultScanPages('mta'),
  )
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
    const nextCode = nextContractCode(contracts)
    setFormCode(nextCode)
    const defaultOwner = owners[0]
    setFormOwnerId(defaultOwner?.id ?? '')
    setFormCustomerName(
      defaultOwner?.tenantName ||
        defaultOwner?.name ||
        'Metro Transit Authority - Sân bay & Ga quốc tế',
    )
    setFormOwnerEmail(defaultOwner?.email || 'owner@spotway.app')
    setFormRepresentative(
      defaultOwner ? `${defaultOwner.name} (Chủ tòa nhà)` : 'Elena Rostova (GĐ Vận hành)',
    )
    setFormDomain(
      defaultOwner
        ? `${(defaultOwner.tenantName || defaultOwner.name || 'metro-transit')
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')}.spotway.app`
        : 'metro-transit.spotway.app',
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
    setFormScanPages(buildDefaultScanPages(defaultOwner?.name || 'mta'))
    setFormNotes(
      'Tủ lưu trữ hồ sơ A-3, ngăn số 08 (Tòa nhà Điều hành Trung tâm). Người thụ lý bàn giao: Nguyễn Văn An - Ban Pháp chế.',
    )
    setNotifyOwner(true)
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
    setFormScanPages(buildDefaultScanPages(c.customerName))
    setFormNotes(c.notes)
    setNotifyOwner(true)
    setModalOpen(true)
  }

  function handleSelectOwnerPreset(val: string) {
    setFormOwnerId(val)
    const found = owners.find((o) => o.id === val)
    if (found) {
      setFormOwnerEmail(found.email)
      setFormCustomerName(found.tenantName || found.name || found.email.split('@')[0])
      setFormRepresentative(`${found.name || found.email.split('@')[0]} (Chủ tòa nhà)`)
      setFormDomain(
        `${(found.tenantName || found.name || 'workspace')
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')}.spotway.app`,
      )
      return
    }
    if (val === 'preset-vingroup') {
      setFormCustomerName('Vincom Mega Mall Smart City')
      setFormOwnerEmail('owner.smartcity@vincom.vn')
      setFormRepresentative('Nguyễn Hoàng Minh (GĐ Tổ hợp)')
      setFormDomain('smartcity-vincom.spotway.app')
    } else if (val === 'preset-saigon') {
      setFormCustomerName('Saigon Mega Mall - Central Atrium Ops')
      setFormOwnerEmail('ops@saigonmegamall.vn')
      setFormRepresentative('Trần Minh Quân (GĐ Vận hành)')
      setFormDomain('saigon-atrium.spotway.app')
    } else if (val === 'preset-noibai') {
      setFormCustomerName('Cảng Hàng không Quốc tế Nội Bài T2')
      setFormOwnerEmail('spatial.ops@noibai.aero')
      setFormRepresentative('Lê Quang Đạo (Trưởng ban Khai thác)')
      setFormDomain('noibai-t2.spotway.app')
    }
  }

  function processUploadedFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    Array.from(fileList).forEach((file) => {
      const sizeMb = Math.max(0.2, file.size / (1024 * 1024)).toFixed(1)
      const isImg = file.type.startsWith('image/')
      const itemId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      if (isImg) {
        const reader = new FileReader()
        reader.onload = () => {
          setFormScanPages((prev) => [
            ...prev,
            {
              id: itemId,
              fileName: file.name,
              sizeText: `${sizeMb} MB · Ký tên & Con dấu`,
              statusText: 'Hợp lệ',
              iconName: 'verified_user',
              iconColor: '#f8acff',
              dataUrl: typeof reader.result === 'string' ? reader.result : null,
            },
          ])
        }
        reader.readAsDataURL(file)
      } else {
        setFormScanPages((prev) => [
          ...prev,
          {
            id: itemId,
            fileName: file.name,
            sizeText: `${sizeMb} MB`,
            statusText: 'Hoàn tất 100%',
            iconName: 'check_circle',
            iconColor: '#5de6ff',
            dataUrl: null,
          },
        ])
      }
    })
  }

  function handleMovePage(index: number, direction: -1 | 1) {
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= formScanPages.length) return
    setFormScanPages((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[targetIdx]
      copy[targetIdx] = temp
      return copy
    })
  }

  function handleRemovePage(id: string) {
    setFormScanPages((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleSaveContract(e: React.FormEvent) {
    e.preventDefault()
    if (!formCustomerName.trim()) {
      message.error('Vui lòng chọn hoặc nhập tên Khách hàng / Chủ tòa nhà.')
      return
    }
    setSaving(true)
    try {
      const matchedOwner = owners.find(
        (o) =>
          o.id === formOwnerId ||
          o.email.toLowerCase() === formOwnerEmail.trim().toLowerCase(),
      )
      const firstImgPage = formScanPages.find((p) => p.dataUrl)
      const payload = {
        contractCode: formCode.trim() || nextContractCode(contracts),
        ownerId: matchedOwner?.id ?? (owners[0]?.id || null),
        tenantId: matchedOwner?.tenantId ?? (owners[0]?.tenantId || null),
        customerName: formCustomerName.trim(),
        ownerEmail:
          formOwnerEmail.trim() || matchedOwner?.email || 'owner@spotway.app',
        representative: formRepresentative.trim() || formCustomerName.trim(),
        workspaceDomain: formDomain.trim() || 'workspace.spotway.app',
        startDate: formStartDate,
        endDate: formEndDate,
        annualValue: Number(String(formValue).replace(/[^0-9.]/g, '')) || 0,
        currency: formCurrency,
        billingLabel: null,
        paymentStatus: formPaymentStatus,
        maxBuildings: Math.max(1, Number(formMaxBuildings) || 3),
        maxFloors: Math.max(1, Number(formMaxFloors) || 15),
        pageCount: Math.max(1, formScanPages.length || 3),
        scanFileName:
          formScanPages[0]?.fileName || `${formCode.trim()}-Signed.pdf`,
        scanDataUrl: firstImgPage?.dataUrl ?? null,
        notes: formNotes.trim(),
      }

      if (editingId) {
        const updated = await updateAdminContract(editingId, payload)
        setContracts((prev) => prev.map((c) => (c.id === editingId ? updated : c)))
        message.success(
          notifyOwner
            ? `Đã lưu hợp đồng ${updated.contractCode} và đồng bộ sang cổng Chủ tòa nhà!`
            : `Đã cập nhật hợp đồng ${updated.contractCode}!`,
        )
      } else {
        const created = await createAdminContract(payload)
        setContracts((prev) => [created, ...prev])
        setSelectedId(created.id)
        message.success(
          notifyOwner
            ? `Đã số hóa hợp đồng ${created.contractCode} và gửi thông báo tới Chủ tòa nhà!`
            : `Đã tạo và lưu trữ hợp đồng ${created.contractCode}!`,
        )
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
      {/* ── Page Header ── */}
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
            Kho lưu trữ và số hóa bản scan hợp đồng dịch vụ ký ngoại tuyến với Chủ tòa nhà.
          </p>
        </div>

        <div className="adm-hero__actions">
          <button
            type="button"
            className="adm-btn"
            onClick={openCreateModal}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              upload_file
            </span>
            <span>+ Nhập hàng loạt</span>
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
              placeholder="Tìm theo số hợp đồng, tên khách hàng..."
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
            <span>{sortAsc ? 'Hạn gần nhất' : 'Sắp xếp'}</span>
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
                  <th>Khách hàng</th>
                  <th>Thời hạn</th>
                  <th>Giá trị</th>
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
                          </div>
                        </td>

                        <td>
                          <div className="cnt-customer-cell">
                            <div className="cnt-customer-avatar">
                              {getInitials(c.customerName)}
                            </div>
                            <div>
                              <div className="cnt-customer-name">{c.customerName}</div>
                              <div className="cnt-customer-sub">{c.workspaceDomain}</div>
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
                    Ký kết ngày {formatDateVN(selectedContract.startDate)} · Hồ sơ thẩm định điện tử
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

            {/* Compact Info List */}
            <div className="cnt-info-grid">
              <div className="cnt-info-item">
                <span className="cnt-info-label">Khách hàng</span>
                <span className="cnt-info-value" style={{ color: '#5de6ff' }}>
                  {selectedContract.customerName}
                </span>
                <span className="cnt-info-sub">
                  Đại diện: {selectedContract.representative}
                </span>
              </div>

              <div className="cnt-info-item">
                <span className="cnt-info-label">Giá trị hợp đồng</span>
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
                  ✓{' '}
                  {selectedContract.paymentStatus === 'paid'
                    ? 'Đã thanh toán kỳ 1'
                    : 'Chờ thanh toán'}
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
                <span>Chỉnh sửa</span>
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

      {/* ── Focused High-End 2-Column Glassmorphism Upload & Create Contract Modal ── */}
      {modalOpen && (
        <div
          className="adm-modal-backdrop"
          onClick={() => !saving && setModalOpen(false)}
          role="presentation"
        >
          <div
            className="cnt-upload-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Micro Ambient Light Strip */}
            <div className="cnt-upload-modal__toplight" />

            {/* Modal Header */}
            <div className="cnt-upload-modal__header">
              <div className="cnt-upload-modal__header-left">
                <div className="cnt-upload-modal__icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: 26 }}>
                    note_add
                  </span>
                </div>
                <div>
                  <div className="cnt-upload-modal__title-row">
                    <h2 className="cnt-upload-modal__title">
                      {editingId
                        ? 'Cập nhật & Lưu trữ hợp đồng'
                        : 'Tải lên & Lưu trữ hợp đồng mới'}
                    </h2>
                    <span className="cnt-upload-modal__ocr-badge">OFFLINE OCR SYNC</span>
                  </div>
                  <p className="cnt-upload-modal__subtitle">
                    Khai báo thông tin cơ bản và lưu trữ bản scan hợp đồng đã ký ngoại tuyến với Chủ
                    tòa nhà.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="cnt-upload-modal__close"
                onClick={() => setModalOpen(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal Two-Column Form Body */}
            <form onSubmit={handleSaveContract} style={{ display: 'contents' }}>
              <div className="cnt-upload-modal__body">
                <div className="cnt-upload-grid">
                  {/* LEFT COLUMN: 1. Thông tin văn bản & Đối tác */}
                  <div className="cnt-upload-col">
                    <div className="cnt-upload-sec-header">
                      <div className="cnt-upload-sec-title">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          feed
                        </span>
                        <span>1. Thông tin văn bản &amp; Đối tác</span>
                      </div>
                    </div>

                    {/* Khách hàng / Doanh nghiệp Select */}
                    <div className="cnt-upload-field">
                      <div className="cnt-upload-label-row">
                        <label className="cnt-upload-label">
                          Khách hàng / Doanh nghiệp (Chủ tòa nhà){' '}
                          <span style={{ color: '#f8acff' }}>*</span>
                        </label>
                        <button
                          type="button"
                          className="cnt-upload-label-link"
                          onClick={() => {
                            setModalOpen(false)
                            navigate('/admin/accounts?create=1')
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                            add_circle
                          </span>
                          <span>+ Thêm khách hàng mới</span>
                        </button>
                      </div>

                      <div className="cnt-upload-input-wrap">
                        <select
                          className="cnt-upload-select"
                          value={formOwnerId}
                          onChange={(e) => handleSelectOwnerPreset(e.target.value)}
                        >
                          {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.tenantName || o.name} ({o.email})
                            </option>
                          ))}
                          <option value="preset-mta">
                            Metro Transit Authority - Sân bay &amp; Ga quốc tế
                          </option>
                          <option value="preset-vingroup">
                            Vincom Mega Mall Smart City - Vingroup Retail
                          </option>
                          <option value="preset-saigon">
                            Saigon Mega Mall - Central Atrium Ops
                          </option>
                          <option value="preset-noibai">
                            Cảng Hàng không Quốc tế Nội Bài T2
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Số hợp đồng ngoại tuyến */}
                    <div className="cnt-upload-field">
                      <label className="cnt-upload-label">
                        Số hợp đồng ngoại tuyến <span style={{ color: '#f8acff' }}>*</span>
                      </label>
                      <div className="cnt-upload-input-wrap">
                        <input
                          type="text"
                          className="cnt-upload-input"
                          style={{ paddingRight: 36, letterSpacing: '0.04em', fontWeight: 600 }}
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value)}
                          placeholder="Ví dụ: HD-2026-001"
                          required
                        />
                        <span
                          className="material-symbols-outlined"
                          style={{
                            position: 'absolute',
                            right: 12,
                            fontSize: 18,
                            color: '#5de6ff',
                          }}
                        >
                          verified
                        </span>
                      </div>
                      <span className="cnt-upload-hint">
                        Định dạng chuẩn: [TIỀN TỐ]-[NĂM]-[MÃ 3 CHỮ SỐ]
                      </span>
                    </div>

                    {/* Thời hạn hiệu lực: Ngày bắt đầu & Ngày kết thúc */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 12,
                      }}
                    >
                      <div className="cnt-upload-field">
                        <label className="cnt-upload-label">
                          Ngày bắt đầu <span style={{ color: '#f8acff' }}>*</span>
                        </label>
                        <div className="cnt-upload-input-wrap">
                          <input
                            type="date"
                            className="cnt-upload-input"
                            value={formStartDate}
                            onChange={(e) => setFormStartDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="cnt-upload-field">
                        <label className="cnt-upload-label">
                          Ngày kết thúc <span style={{ color: '#f8acff' }}>*</span>
                        </label>
                        <div className="cnt-upload-input-wrap">
                          <input
                            type="date"
                            className="cnt-upload-input"
                            value={formEndDate}
                            onChange={(e) => setFormEndDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Giá trị hợp đồng & Trạng thái thanh toán */}
                    <div className="cnt-upload-field">
                      <label className="cnt-upload-label">
                        Giá trị hợp đồng (Tùy chọn)
                      </label>
                      <div className="cnt-value-row">
                        <div className="cnt-upload-input-wrap" style={{ flex: 1 }}>
                          <button
                            type="button"
                            className="cnt-currency-badge-btn"
                            title="Bấm để đổi đơn vị tiền tệ USD / VNĐ"
                            onClick={() =>
                              setFormCurrency((c) => (c === 'USD' ? 'VND' : 'USD'))
                            }
                          >
                            {formCurrency === 'USD' ? '$ USD' : '₫ VND'}
                          </button>
                          <input
                            type="text"
                            className="cnt-upload-input"
                            style={{ paddingLeft: 74, textAlign: 'right', fontWeight: 700 }}
                            value={formValue}
                            onChange={(e) => setFormValue(e.target.value)}
                          />
                        </div>

                        <label className="cnt-paid-check-pill">
                          <input
                            type="checkbox"
                            checked={formPaymentStatus === 'paid'}
                            onChange={(e) =>
                              setFormPaymentStatus(e.target.checked ? 'paid' : 'pending')
                            }
                            style={{ accentColor: '#a078ff', width: 16, height: 16 }}
                          />
                          <span>Đã thanh toán</span>
                        </label>
                      </div>
                    </div>

                    {/* Ghi chú & Vị trí lưu trữ bản gốc */}
                    <div className="cnt-upload-field">
                      <label className="cnt-upload-label">
                        Ghi chú &amp; Vị trí lưu trữ bản gốc
                      </label>
                      <textarea
                        className="cnt-upload-textarea"
                        rows={3}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Nhập ghi chú pháp lý, vị trí tủ hồ sơ vật lý hoặc người phụ trách..."
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: 2. Upload & Quản lý tệp scan */}
                  <div className="cnt-upload-col">
                    <div className="cnt-upload-sec-header">
                      <div className="cnt-upload-sec-title cnt-upload-sec-title--cyan">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                          cloud_upload
                        </span>
                        <span>2. Upload &amp; Quản lý tệp scan</span>
                      </div>
                      <span
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#f8acff',
                        }}
                      >
                        {formScanPages.length} trang đã sẵn sàng
                      </span>
                    </div>

                    {/* Large Drag-and-Drop Upload Zone */}
                    <div
                      className={`cnt-dropzone ${isDragging ? 'cnt-dropzone--dragging' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setIsDragging(true)
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setIsDragging(false)
                        processUploadedFiles(e.dataTransfer.files)
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => processUploadedFiles(e.target.files)}
                      />
                      <div className="cnt-dropzone__icon">
                        <span className="material-symbols-outlined" style={{ fontSize: 30 }}>
                          upload_file
                        </span>
                      </div>
                      <span className="cnt-dropzone__title">
                        Kéo thả ảnh hoặc PDF hợp đồng vào đây
                      </span>
                      <span className="cnt-dropzone__sub">
                        Hỗ trợ tệp định dạng JPG, PNG, PDF (tối đa 10MB mỗi tệp)
                      </span>
                      <button
                        type="button"
                        className="cnt-dropzone__btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                          folder_open
                        </span>
                        <span>Chọn tệp từ máy tính</span>
                      </button>
                    </div>

                    {/* Uploaded File Thumbnails & Reorder List */}
                    <div className="cnt-pages-list">
                      <div className="cnt-pages-list__head">
                        <span>Danh sách các trang scan</span>
                        <span>Sắp xếp thứ tự trang</span>
                      </div>

                      {formScanPages.map((pg, idx) => (
                        <div key={pg.id} className="cnt-page-item">
                          <span
                            className="material-symbols-outlined"
                            style={{ color: '#958ea0', fontSize: 19 }}
                          >
                            drag_indicator
                          </span>

                          <div className="cnt-page-item__thumb">
                            {pg.dataUrl && (
                              <img
                                src={pg.dataUrl}
                                alt={pg.fileName}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            <span className="cnt-page-item__badge">P{idx + 1}</span>
                          </div>

                          <div className="cnt-page-item__info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="cnt-page-item__name">{pg.fileName}</span>
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 15, color: pg.iconColor }}
                              >
                                {pg.iconName}
                              </span>
                            </div>
                            <div className="cnt-page-item__meta">
                              <span>{pg.sizeText}</span>
                              <span>•</span>
                              <span style={{ color: '#5de6ff', fontWeight: 600 }}>
                                {pg.statusText}
                              </span>
                            </div>
                          </div>

                          <div className="cnt-page-item__actions">
                            <button
                              type="button"
                              className="cnt-page-icon-btn"
                              disabled={idx === 0}
                              onClick={() => handleMovePage(idx, -1)}
                              title="Chuyển lên trang trước"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                arrow_upward
                              </span>
                            </button>
                            <button
                              type="button"
                              className="cnt-page-icon-btn"
                              disabled={idx === formScanPages.length - 1}
                              onClick={() => handleMovePage(idx, 1)}
                              title="Chuyển xuống trang sau"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                arrow_downward
                              </span>
                            </button>
                            <button
                              type="button"
                              className="cnt-page-icon-btn cnt-page-icon-btn--del"
                              onClick={() => handleRemovePage(pg.id)}
                              title="Xóa trang"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>
                                delete
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Helper Note */}
                    <div className="cnt-helper-note">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 17, color: '#5de6ff', marginTop: 1 }}
                      >
                        info
                      </span>
                      <span>
                        Sắp xếp lại thứ tự các trang trong bản scan hợp nhất. Hệ thống sẽ tự động
                        ghép thành 1 file PDF lưu trữ vĩnh viễn và hiển thị cho Chủ tòa nhà.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="cnt-upload-modal__footer">
                <label className="cnt-notify-check">
                  <input
                    type="checkbox"
                    checked={notifyOwner}
                    onChange={(e) => setNotifyOwner(e.target.checked)}
                    style={{ accentColor: '#a078ff', width: 16, height: 16 }}
                  />
                  <span>Gửi thông báo tới Chủ tòa nhà khi hoàn tất tải lên</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="adm-btn"
                    onClick={() => setModalOpen(false)}
                  >
                    Hủy bỏ
                  </button>

                  <button
                    type="submit"
                    className="cnt-submit-ocr-btn"
                    disabled={saving}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
                      document_scanner
                    </span>
                    <span>
                      {saving ? 'Đang lưu & số hóa...' : 'Lưu hợp đồng & Số hóa'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminContractsPage
