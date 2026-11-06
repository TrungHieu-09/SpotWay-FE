import { useCallback, useEffect, useMemo, useState } from 'react'
import { App as AntApp, Popconfirm, Space, Typography } from 'antd'
import { KeyOutlined, DeleteOutlined } from '@ant-design/icons'
import { useSearchParams } from 'react-router-dom'
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  resetAdminUserPassword,
} from '../../api/admin'
import { useAuthStore } from '../../auth/store'
import type { AdminUser, AssignableRole } from '../../types/admin'
import type { Role } from '../../types/auth'
import './AdminPages.css'

const roleLabels: Record<Role, string> = {
  admin: 'Quản trị viên',
  building_owner: 'Chủ tòa nhà',
  building_manager: 'Quản lý tòa nhà',
  store_owner: 'Chủ gian hàng',
}

const assignableRoleCards: Array<{
  role: AssignableRole
  title: string
  desc: string
  icon: string
  activeClass: string
  iconBg: string
  iconColor: string
}> = [
  {
    role: 'building_owner',
    title: 'Chủ tòa nhà',
    desc: 'Sở hữu & quản lý tòa nhà, mặt sàn và đội ngũ',
    icon: 'domain',
    activeClass: 'adm-role-card--active-owner',
    iconBg: 'rgba(16, 185, 129, 0.16)',
    iconColor: '#34d399',
  },
  {
    role: 'building_manager',
    title: 'Quản lý tòa nhà',
    desc: 'Vận hành khu vực & bản đồ mặt sàn',
    icon: 'corporate_fare',
    activeClass: 'adm-role-card--active-manager',
    iconBg: 'rgba(168, 85, 247, 0.16)',
    iconColor: '#c084fc',
  },
  {
    role: 'store_owner',
    title: 'Chủ gian hàng',
    desc: 'Quản lý gian hàng, điểm thuê & ưu đãi',
    icon: 'storefront',
    activeClass: 'adm-role-card--active-store',
    iconBg: 'rgba(245, 158, 11, 0.16)',
    iconColor: '#fbbf24',
  },
]

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const letters = Array.from(bytes.slice(0, 9), (b) => alphabet[b % alphabet.length]).join('')
  const digits = Array.from(bytes.slice(9), (b) => String(b % 10)).join('')
  return `${letters}@${digits}`
}

function getInitials(nameOrEmail: string): string {
  const cleaned = nameOrEmail.split('@')[0].trim()
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return cleaned.slice(0, 2).toUpperCase() || 'U'
}

const PAGE_SIZE = 10

export function AdminAccountsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [keyword, setKeyword] = useState(() => searchParams.get('q') ?? '')
  const [role, setRole] = useState<Role | undefined>(() => {
    const r = searchParams.get('role') as Role | null
    return r && r in roleLabels ? r : undefined
  })
  const [tenantFilter, setTenantFilter] = useState<string>('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(() => searchParams.get('create') === '1')
  const [creating, setCreating] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formRole, setFormRole] = useState<AssignableRole>('building_owner')
  const [formOwnerId, setFormOwnerId] = useState<string>('')
  const [formErrors, setFormErrors] = useState<{
    email?: string
    password?: string
    ownerId?: string
  }>({})
  const { message, modal } = AntApp.useApp()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminUsers()
      setUsers(data)
      setSelectedIds([])
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (searchParams.get('create') === '1' || searchParams.get('role') || searchParams.get('q')) {
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const owners = useMemo(
    () => users.filter((u) => u.role === 'building_owner'),
    [users],
  )
  const needsOwner = formRole === 'building_manager' || formRole === 'store_owner'

  const roleCounts = useMemo(() => {
    return {
      total: users.length,
      building_owner: users.filter((u) => u.role === 'building_owner').length,
      building_manager: users.filter((u) => u.role === 'building_manager').length,
      store_owner: users.filter((u) => u.role === 'store_owner').length,
      admin: users.filter((u) => u.role === 'admin').length,
    }
  }, [users])

  const tenantNames = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) {
      if (u.tenantName) set.add(u.tenantName)
    }
    return Array.from(set)
  }, [users])

  const visibleUsers = useMemo(() => {
    const normalized = keyword.trim().toLocaleLowerCase('vi-VN')
    return users.filter((user) => {
      const matchesKeyword =
        normalized.length === 0 ||
        `${user.name ?? ''} ${user.email} ${user.tenantName ?? ''}`
          .toLocaleLowerCase('vi-VN')
          .includes(normalized)
      const matchesRole = !role || user.role === role
      const matchesTenant = !tenantFilter || user.tenantName === tenantFilter
      return matchesKeyword && matchesRole && matchesTenant
    })
  }, [keyword, role, tenantFilter, users])

  useEffect(() => {
    setPage(1)
  }, [keyword, role, tenantFilter])

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return visibleUsers.slice(start, start + PAGE_SIZE)
  }, [visibleUsers, currentPage])

  const hasFilters = Boolean(keyword || role || tenantFilter)

  function openCreate() {
    setFormEmail('')
    setFormPassword('')
    setShowPassword(false)
    setFormRole('building_owner')
    setFormOwnerId(owners[0]?.id ?? '')
    setFormErrors({})
    setCreateOpen(true)
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: { email?: string; password?: string; ownerId?: string } = {}
    const trimmedEmail = formEmail.trim()
    if (!trimmedEmail) {
      nextErrors.email = 'Vui lòng nhập email đăng nhập'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Định dạng email không hợp lệ'
    }

    if (!formPassword) {
      nextErrors.password = 'Vui lòng nhập mật khẩu'
    } else if (formPassword.length < 8 || formPassword.length > 72) {
      nextErrors.password = 'Mật khẩu cần từ 8 đến 72 ký tự'
    }

    if (needsOwner && !formOwnerId) {
      nextErrors.ownerId = 'Vui lòng chọn chủ tòa nhà quản lý tài khoản này'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setFormErrors({})
    setCreating(true)
    try {
      await createAdminUser({
        email: trimmedEmail,
        password: formPassword,
        role: formRole,
        ownerId: needsOwner ? formOwnerId : undefined,
      })
      message.success(`Đã tạo tài khoản ${trimmedEmail} (${roleLabels[formRole]}).`)
      setCreateOpen(false)
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function resetPassword(user: AdminUser) {
    try {
      const result = await resetAdminUserPassword(user.id)
      modal.info({
        title: 'Đã đặt lại mật khẩu',
        content: (
          <div>
            <p>
              Mật khẩu tạm của <strong>{user.email}</strong> (người dùng đã bị đăng xuất khỏi mọi thiết bị):
            </p>
            <Typography.Text code copyable>
              {result.temporaryPassword}
            </Typography.Text>
          </div>
        ),
      })
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function remove(userId: string) {
    try {
      await deleteAdminUser(userId)
      message.success('Đã xóa tài khoản')
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      let deletedCount = 0
      for (const id of selectedIds) {
        if (id === currentUserId) continue
        await deleteAdminUser(id)
        deletedCount++
      }
      message.success(`Đã xóa ${deletedCount} tài khoản.`)
      await reload()
    } catch (error) {
      message.error((error as Error).message)
      await reload()
    } finally {
      setBulkDeleting(false)
    }
  }

  const selectablePageUsers = pagedUsers.filter((u) => u.id !== currentUserId)
  const allPageSelected =
    selectablePageUsers.length > 0 &&
    selectablePageUsers.every((u) => selectedIds.includes(u.id))

  function toggleSelectAllPage() {
    if (allPageSelected) {
      const pageSet = new Set(selectablePageUsers.map((u) => u.id))
      setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)))
    } else {
      const next = new Set(selectedIds)
      for (const u of selectablePageUsers) next.add(u.id)
      setSelectedIds(Array.from(next))
    }
  }

  function toggleSelectOne(userId: string) {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  return (
    <main className="adm-page">
      {/* ── Header Row ── */}
      <div className="adm-hero">
        <div>
          <div className="adm-hero__eyebrow">
            <span className="adm-hero__eyebrow-dot" />
            QUẢN TRỊ HỆ THỐNG
          </div>
          <div className="adm-hero__title-row">
            <h1 className="adm-hero__title">Quản lý tài khoản</h1>
          </div>
          <p className="adm-hero__subtitle">
            Tạo tài khoản, phân quyền và quản lý người dùng trên toàn nền tảng.
          </p>
        </div>

        <div className="adm-hero__actions">
          <button
            type="button"
            className="adm-btn adm-btn--primary"
            onClick={openCreate}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              person_add
            </span>
            <span>+ Tạo tài khoản</span>
          </button>
        </div>
      </div>

      {/* ── 5 Interactive Role Stat Cards ── */}
      <div className="adm-stat-grid">
        {/* Card 1: Tất cả */}
        <div
          className={`adm-glass-card adm-stat-card adm-stat-card--clickable ${!role ? 'adm-stat-card--selected' : ''}`}
          onClick={() => setRole(undefined)}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Tất cả</p>
              <h3 className="adm-stat-card__value">{roleCounts.total}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--pink">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#f472b6' }}>
              Tổng số tài khoản
            </span>
          </div>
        </div>

        {/* Card 2: Chủ tòa nhà */}
        <div
          className={`adm-glass-card adm-stat-card adm-stat-card--clickable ${role === 'building_owner' ? 'adm-stat-card--selected' : ''}`}
          onClick={() => setRole(role === 'building_owner' ? undefined : 'building_owner')}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Chủ tòa nhà</p>
              <h3 className="adm-stat-card__value">{roleCounts.building_owner}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--emerald">
              <span className="material-symbols-outlined">domain</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#34d399' }}>
              Chủ sở hữu
            </span>
          </div>
        </div>

        {/* Card 3: Quản lý tòa nhà */}
        <div
          className={`adm-glass-card adm-stat-card adm-stat-card--clickable ${role === 'building_manager' ? 'adm-stat-card--selected' : ''}`}
          onClick={() => setRole(role === 'building_manager' ? undefined : 'building_manager')}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Quản lý tòa nhà</p>
              <h3 className="adm-stat-card__value">{roleCounts.building_manager}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--purple">
              <span className="material-symbols-outlined">corporate_fare</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#c084fc' }}>
              Vận hành khu vực
            </span>
          </div>
        </div>

        {/* Card 4: Chủ gian hàng */}
        <div
          className={`adm-glass-card adm-stat-card adm-stat-card--clickable ${role === 'store_owner' ? 'adm-stat-card--selected' : ''}`}
          onClick={() => setRole(role === 'store_owner' ? undefined : 'store_owner')}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Chủ gian hàng</p>
              <h3 className="adm-stat-card__value">{roleCounts.store_owner}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--amber">
              <span className="material-symbols-outlined">storefront</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#fbbf24' }}>
              Điểm thuê &amp; Kiosk
            </span>
          </div>
        </div>

        {/* Card 5: Quản trị viên */}
        <div
          className={`adm-glass-card adm-stat-card adm-stat-card--clickable ${role === 'admin' ? 'adm-stat-card--selected' : ''}`}
          onClick={() => setRole(role === 'admin' ? undefined : 'admin')}
        >
          <div className="adm-stat-card__top">
            <div>
              <p className="adm-stat-card__label">Quản trị viên</p>
              <h3 className="adm-stat-card__value">{roleCounts.admin}</h3>
            </div>
            <div className="adm-stat-card__icon adm-stat-card__icon--pink">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
          </div>
          <div className="adm-stat-card__bottom">
            <span className="adm-stat-card__meta" style={{ color: '#f472b6' }}>
              Toàn quyền hệ thống
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="adm-glass-card adm-toolbar">
        <div className="adm-toolbar__left">
          <div className="adm-search-box">
            <span className="material-symbols-outlined adm-search-box__icon">search</span>
            <input
              type="text"
              className="adm-search-box__input"
              placeholder="Tìm theo tên, email, chủ tòa nhà..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <select
            className="adm-select"
            value={role ?? ''}
            onChange={(e) => setRole((e.target.value || undefined) as Role | undefined)}
          >
            <option value="">Vai trò: Tất cả</option>
            {Object.entries(roleLabels).map(([val, label]) => (
              <option key={val} value={val}>
                Vai trò: {label}
              </option>
            ))}
          </select>

          {tenantNames.length > 0 && (
            <select
              className="adm-select"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
            >
              <option value="">Chủ tòa nhà: Tất cả</option>
              {tenantNames.map((name) => (
                <option key={name} value={name}>
                  Chủ tòa nhà: {name}
                </option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button
              type="button"
              className="adm-btn adm-btn--sm"
              onClick={() => {
                setKeyword('')
                setRole(undefined)
                setTenantFilter('')
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div style={{ fontSize: 12.5, color: '#cbc3d7' }}>
          Hiển thị <strong style={{ color: '#fff' }}>{visibleUsers.length}</strong> / {users.length} tài khoản
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selectedIds.length > 0 && (
        <div className="adm-bulk-bar">
          <div className="adm-bulk-bar__left">
            <div className="adm-bulk-bar__check">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                check
              </span>
            </div>
            <span>
              Đã chọn <strong style={{ color: '#f472b6' }}>{selectedIds.length}</strong> tài khoản
            </span>
          </div>

          <div className="adm-bulk-bar__right">
            <Popconfirm
              title={`Xóa ${selectedIds.length} tài khoản đã chọn?`}
              okText="Xóa"
              cancelText="Hủy"
              onConfirm={() => void handleBulkDelete()}
            >
              <button
                type="button"
                className="adm-btn adm-btn--sm adm-btn--danger"
                disabled={bulkDeleting}
              >
                <DeleteOutlined />
                <span>Xóa đã chọn</span>
              </button>
            </Popconfirm>
            <button
              type="button"
              className="adm-btn adm-btn--sm"
              onClick={() => setSelectedIds([])}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* ── Accounts Glass Table ── */}
      <div className="adm-glass-card adm-table-card">
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAllPage}
                    disabled={selectablePageUsers.length === 0}
                    style={{ cursor: 'pointer', accentColor: '#ec4899' }}
                  />
                </th>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Thuộc chủ tòa nhà / Phạm vi</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: '#958ea0' }}>
                    Đang tải danh sách tài khoản...
                  </td>
                </tr>
              ) : pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 36, color: '#958ea0' }}>
                    {hasFilters
                      ? 'Không tìm thấy tài khoản phù hợp với bộ lọc.'
                      : 'Chưa có tài khoản nào.'}
                  </td>
                </tr>
              ) : (
                pagedUsers.map((user) => {
                  const isSelf = user.id === currentUserId
                  const isSelected = selectedIds.includes(user.id)
                  return (
                    <tr
                      key={user.id}
                      className={isSelected ? 'adm-row--selected' : undefined}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isSelf}
                          onChange={() => toggleSelectOne(user.id)}
                          style={{
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                            accentColor: '#ec4899',
                          }}
                        />
                      </td>
                      <td>
                        <div className="adm-user-cell">
                          <div className={`adm-user-avatar adm-user-avatar--${user.role}`}>
                            {getInitials(user.name || user.email)}
                          </div>
                          <div>
                            <div className="adm-user-cell__name">
                              {user.name || user.email.split('@')[0]}
                            </div>
                            <div className="adm-user-cell__email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`adm-role-pill adm-role-pill--${user.role}`}>
                          <span className="adm-role-pill__dot" />
                          {roleLabels[user.role] ?? user.role}
                        </span>
                      </td>
                      <td>
                        {user.role === 'admin'
                          ? 'Toàn hệ thống'
                          : user.role === 'building_owner'
                            ? 'Chính họ'
                            : (user.tenantName ?? '—')}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12.5, color: '#958ea0' }}>
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Space wrap>
                          <Popconfirm
                            title="Đặt lại mật khẩu cho tài khoản này?"
                            okText="Đặt lại"
                            cancelText="Hủy"
                            onConfirm={() => void resetPassword(user)}
                          >
                            <button type="button" className="adm-btn adm-btn--sm">
                              <KeyOutlined />
                              <span>Đặt lại mật khẩu</span>
                            </button>
                          </Popconfirm>
                          <Popconfirm
                            title="Xóa tài khoản này?"
                            okText="Xóa"
                            cancelText="Hủy"
                            onConfirm={() => void remove(user.id)}
                            disabled={isSelf}
                          >
                            <button
                              type="button"
                              className="adm-btn adm-btn--sm adm-btn--danger"
                              disabled={isSelf}
                              title={isSelf ? 'Không thể tự xóa chính mình' : undefined}
                            >
                              <DeleteOutlined />
                              <span>Xóa</span>
                            </button>
                          </Popconfirm>
                        </Space>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="adm-table-footer">
          <div>
            Hiển thị{' '}
            <strong style={{ color: '#fff' }}>
              {visibleUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} -{' '}
              {Math.min(currentPage * PAGE_SIZE, visibleUsers.length)}
            </strong>{' '}
            trong <strong style={{ color: '#fff' }}>{visibleUsers.length}</strong> người dùng
          </div>

          <div className="adm-pagination">
            <button
              type="button"
              className="adm-btn adm-btn--sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹ Trước
            </button>
            <span className="adm-page-num">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="adm-btn adm-btn--sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau ›
            </button>
          </div>
        </div>
      </div>

      {/* ── Custom Spatial Glass Create Account Modal ── */}
      {createOpen && (
        <div
          className="adm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) {
              setCreateOpen(false)
            }
          }}
        >
          <div className="adm-modal-card" role="dialog" aria-modal="true">
            <div className="adm-modal-card__topline" />

            <div className="adm-modal-card__head">
              <div className="adm-modal-card__head-left">
                <div className="adm-modal-card__badge">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                    person_add
                  </span>
                </div>
                <div>
                  <h2 className="adm-modal-card__title">Tạo tài khoản mới</h2>
                  <p className="adm-modal-card__subtitle">
                    Cấp quyền truy cập không gian SpotWay cho đối tác &amp; nhân sự
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="adm-modal-card__close"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  close
                </span>
              </button>
            </div>

            <form className="adm-modal-form" onSubmit={(e) => void handleCreateSubmit(e)} noValidate>
              {/* 1. Email Field */}
              <div className="adm-field">
                <label className="adm-field__label">
                  <span>
                    Email đăng nhập <span className="adm-field__req">*</span>
                  </span>
                </label>
                <div className="adm-input-wrap">
                  <span className="material-symbols-outlined adm-input-wrap__icon">mail</span>
                  <input
                    type="email"
                    className="adm-input"
                    placeholder="vd: owner@spotway.app"
                    autoComplete="off"
                    value={formEmail}
                    onChange={(e) => {
                      setFormEmail(e.target.value)
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                  />
                </div>
                {formErrors.email && (
                  <p className="adm-field__error">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      error
                    </span>
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* 2. Password Field */}
              <div className="adm-field">
                <label className="adm-field__label">
                  <span>
                    Mật khẩu khởi tạo <span className="adm-field__req">*</span>
                  </span>
                  {formPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(formPassword)
                        message.success('Đã sao chép mật khẩu vào bộ nhớ tạm')
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#22d3ee',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        content_copy
                      </span>
                      Sao chép
                    </button>
                  )}
                </label>
                <div className="adm-input-row">
                  <div className="adm-input-wrap">
                    <span className="material-symbols-outlined adm-input-wrap__icon">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="adm-input"
                      placeholder="Nhập tối thiểu 8 ký tự..."
                      autoComplete="new-password"
                      value={formPassword}
                      onChange={(e) => {
                        setFormPassword(e.target.value)
                        if (formErrors.password) {
                          setFormErrors((prev) => ({ ...prev, password: undefined }))
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="adm-input-wrap__eye"
                      onClick={() => setShowPassword((prev) => !prev)}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="adm-gen-btn"
                    onClick={() => {
                      const generated = generatePassword()
                      setFormPassword(generated)
                      setShowPassword(true)
                      if (formErrors.password) {
                        setFormErrors((prev) => ({ ...prev, password: undefined }))
                      }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      auto_fix_high
                    </span>
                    Tạo ngẫu nhiên
                  </button>
                </div>
                {formErrors.password ? (
                  <p className="adm-field__error">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      error
                    </span>
                    {formErrors.password}
                  </p>
                ) : (
                  <p className="adm-field__hint">
                    Tối thiểu 8 ký tự. Hãy gửi mật khẩu này cho người dùng sau khi tạo.
                  </p>
                )}
              </div>

              {/* 3. Role Selection Cards (Only 3 operational roles, NO admin) */}
              <div className="adm-field">
                <label className="adm-field__label">
                  <span>
                    Vai trò phân quyền <span className="adm-field__req">*</span>
                  </span>
                </label>
                <div className="adm-role-cards">
                  {assignableRoleCards.map((item) => {
                    const isSelected = formRole === item.role
                    return (
                      <button
                        key={item.role}
                        type="button"
                        className={`adm-role-card ${isSelected ? item.activeClass : ''}`}
                        onClick={() => {
                          setFormRole(item.role)
                          if (
                            (item.role === 'building_manager' || item.role === 'store_owner') &&
                            !formOwnerId &&
                            owners.length > 0
                          ) {
                            setFormOwnerId(owners[0].id)
                          }
                          setFormErrors((prev) => ({ ...prev, ownerId: undefined }))
                        }}
                      >
                        <div className="adm-role-card__top">
                          <div
                            className="adm-role-card__icon"
                            style={{ background: item.iconBg, color: item.iconColor }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              {item.icon}
                            </span>
                          </div>
                          {isSelected && (
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: 18, color: item.iconColor }}
                            >
                              check_circle
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="adm-role-card__title">{item.title}</p>
                          <p className="adm-role-card__desc">{item.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 4. Conditional Building Owner Select */}
              {needsOwner && (
                <div className="adm-field">
                  <label className="adm-field__label">
                    <span>
                      Trực thuộc Chủ tòa nhà <span className="adm-field__req">*</span>
                    </span>
                  </label>
                  <div className="adm-input-wrap">
                    <span className="material-symbols-outlined adm-input-wrap__icon">
                      apartment
                    </span>
                    <select
                      className="adm-input"
                      style={{ appearance: 'auto', cursor: 'pointer', paddingRight: 16 }}
                      value={formOwnerId}
                      onChange={(e) => {
                        setFormOwnerId(e.target.value)
                        if (formErrors.ownerId) {
                          setFormErrors((prev) => ({ ...prev, ownerId: undefined }))
                        }
                      }}
                    >
                      <option value="" disabled style={{ background: '#12122a', color: '#958ea0' }}>
                        {owners.length === 0
                          ? 'Chưa có chủ tòa nhà nào — vui lòng tạo Chủ tòa nhà trước'
                          : '— Chọn chủ tòa nhà quản lý —'}
                      </option>
                      {owners.map((owner) => (
                        <option
                          key={owner.id}
                          value={owner.id}
                          style={{ background: '#12122a', color: '#ffffff' }}
                        >
                          {owner.name ? `${owner.name} (${owner.email})` : owner.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formErrors.ownerId && (
                    <p className="adm-field__error">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                        error
                      </span>
                      {formErrors.ownerId}
                    </p>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="adm-modal-footer">
                <button
                  type="button"
                  className="adm-btn"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="adm-btn adm-btn--primary"
                  disabled={creating}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {creating ? 'hourglass_top' : 'check'}
                  </span>
                  <span>{creating ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
