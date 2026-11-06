import { useCallback, useEffect, useState } from 'react'
import { App as AntApp, Button, Popconfirm, Spin, Select, Typography } from 'antd'
import {
  PlusOutlined,
  LockOutlined,
  UnlockOutlined,
  DeleteOutlined,
  ReloadOutlined,
  TeamOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useLocation } from 'react-router-dom'
import {
  createTenantUser,
  deleteTenantUser,
  getTenantAreas,
  getTenantUsers,
  updateTenantUser,
} from '../../api/tenant'
import type { Role, User } from '../../types/auth'
import type { Area } from '../../types/area'
import { GlassCard, StatusPill } from '../../components/ui'
import './OwnerStaffPage.css'

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const letters = Array.from(bytes.slice(0, 8), (b) => alphabet[b % alphabet.length]).join('')
  const digits = Array.from(bytes.slice(8), (b) => String(b % 10)).join('')
  return `${letters}@${digits}`
}

export function OwnerStaffPage() {
  const [users, setUsers] = useState<User[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Controlled state for custom Spatial Glass Modal
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formRole, setFormRole] = useState<'building_manager' | 'store_owner'>('building_manager')
  const [formAreaIds, setFormAreaIds] = useState<string[]>([])
  const [formErrors, setFormErrors] = useState<{
    name?: string
    email?: string
    password?: string
  }>({})

  const { message, modal } = AntApp.useApp()
  const location = useLocation()

  const managerView = location.pathname.endsWith('/managers')
  const storeOwnerView = location.pathname.endsWith('/store-owners')
  const title = managerView
    ? 'Quản lý khu vực'
    : storeOwnerView
      ? 'Chủ gian hàng'
      : 'Tài khoản nhân sự'
  const defaultRole: 'building_manager' | 'store_owner' = storeOwnerView
    ? 'store_owner'
    : 'building_manager'

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [nextUsers, nextAreas] = await Promise.all([
        getTenantUsers(),
        getTenantAreas().catch(() => [] as Area[]),
      ])
      setUsers(nextUsers)
      setAreas(nextAreas)
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    void reload()
  }, [reload, location.pathname])

  function openCreateModal() {
    setFormName('')
    setFormEmail('')
    setFormPassword(generatePassword())
    setShowPassword(true)
    setFormRole(defaultRole)
    setFormAreaIds([])
    setFormErrors({})
    setOpen(true)
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: { name?: string; email?: string; password?: string } = {}
    const trimmedName = formName.trim()
    const trimmedEmail = formEmail.trim()
    const trimmedPassword = formPassword.trim()

    if (!trimmedEmail) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email đăng nhập'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Địa chỉ email không hợp lệ'
    }

    if (trimmedPassword && (trimmedPassword.length < 8 || trimmedPassword.length > 72)) {
      nextErrors.password = 'Mật khẩu cần từ 8 đến 72 ký tự'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setFormErrors({})
    setSubmitting(true)
    try {
      const displayName = trimmedName || trimmedEmail.split('@')[0]
      const result = await createTenantUser({
        name: displayName,
        email: trimmedEmail,
        password: trimmedPassword || undefined,
        role: formRole,
        areaIds: formRole === 'building_manager' ? formAreaIds : [],
      })
      setOpen(false)
      await reload()
      modal.success({
        title: 'Đã tạo tài khoản thành công',
        content: (
          <div style={{ marginTop: 8 }}>
            <p style={{ marginBottom: 8 }}>
              Tài khoản <strong>{result.email}</strong> (
              {formRole === 'building_manager' ? 'Quản lý khu vực' : 'Chủ gian hàng'}) đã sẵn sàng.
            </p>
            <p style={{ marginBottom: 6 }}>Mật khẩu đăng nhập:</p>
            <Typography.Text code copyable style={{ fontSize: 15 }}>
              {result.temporaryPassword}
            </Typography.Text>
          </div>
        ),
      })
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(user: User) {
    const next = user.status === 'active' ? 'locked' : 'active'
    try {
      await updateTenantUser(user.id, next)
      message.success(next === 'active' ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản')
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function resetPassword(user: User) {
    try {
      const result = await updateTenantUser(user.id, user.status, true)
      modal.info({
        title: 'Đã đặt lại mật khẩu',
        content: (
          <div style={{ marginTop: 8 }}>
            <p style={{ marginBottom: 8 }}>
              Mật khẩu tạm mới của <strong>{user.email}</strong>:
            </p>
            <Typography.Text code copyable style={{ fontSize: 15 }}>
              {result.temporaryPassword ?? 'SpotWay@123456'}
            </Typography.Text>
          </div>
        ),
      })
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function removeUser(userId: string) {
    try {
      await deleteTenantUser(userId)
      message.success('Đã xóa tài khoản')
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function updateAreas(user: User, areaIds: string[]) {
    try {
      await updateTenantUser(user.id, user.status, false, areaIds)
      message.success('Đã cập nhật phân công tòa nhà / khu vực')
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  function toggleAreaChip(areaId: string) {
    setFormAreaIds((prev) =>
      prev.includes(areaId) ? prev.filter((id) => id !== areaId) : [...prev, areaId],
    )
  }

  const visibleUsers = users
    .filter((u) => u.role === 'building_manager' || u.role === 'store_owner')
    .filter((u) => !managerView || u.role === 'building_manager')
    .filter((u) => !storeOwnerView || u.role === 'store_owner')

  const roleLabel = (role: Role) =>
    role === 'building_manager' ? 'Quản lý khu vực' : 'Chủ gian hàng'

  return (
    <main className="workspace osp-workspace">
      {/* ── Header ── */}
      <section className="osp-header">
        <div>
          <span className="osp-header__eyebrow">Chủ tòa nhà</span>
          <h1 className="osp-header__title">{title}</h1>
          <p className="osp-header__sub">
            {managerView
              ? 'Chỉ định và phân quyền đội ngũ quản lý tòa nhà, mặt sàn và khu vực vận hành.'
              : storeOwnerView
                ? 'Quản lý danh sách tài khoản đối tác chủ gian hàng và điểm dịch vụ.'
                : 'Phân quyền, khu vực và tài khoản vận hành của doanh nghiệp.'}
          </p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          {managerView
            ? 'Thêm quản lý khu vực'
            : storeOwnerView
              ? 'Thêm chủ gian hàng'
              : 'Tạo tài khoản'}
        </Button>
      </section>

      {/* ── Staff table card ── */}
      <GlassCard title={`${title} (${visibleUsers.length})`}>
        {loading ? (
          <div className="osp-loading">
            <Spin />
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="osp-empty">
            {storeOwnerView ? (
              <ShopOutlined className="osp-empty__icon" />
            ) : (
              <TeamOutlined className="osp-empty__icon" />
            )}
            <p>
              {managerView
                ? 'Chưa có quản lý khu vực nào trong không gian này'
                : storeOwnerView
                  ? 'Chưa có tài khoản chủ gian hàng nào'
                  : 'Chưa có tài khoản nhân sự nào'}
            </p>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              {managerView
                ? 'Thêm quản lý đầu tiên'
                : storeOwnerView
                  ? 'Thêm chủ gian hàng đầu tiên'
                  : 'Tạo tài khoản đầu tiên'}
            </Button>
          </div>
        ) : (
          <div className="osp-table">
            <div className="osp-table__head">
              <span>Họ tên</span>
              <span>Email</span>
              <span>Vai trò</span>
              <span>Tòa nhà / Khu vực phụ trách</span>
              <span>Trạng thái</span>
              <span>Hành động</span>
            </div>

            {visibleUsers.map((user) => (
              <div key={user.id} className="osp-row">
                {/* Name */}
                <div className="osp-row__name">
                  <div
                    className={`osp-row__avatar osp-row__avatar--${user.role === 'building_manager' ? 'violet' : 'cyan'}`}
                  >
                    {user.role === 'building_manager' ? <TeamOutlined /> : <ShopOutlined />}
                  </div>
                  <div>
                    <div className="osp-row__name-text">{user.name}</div>
                    <div className="osp-row__role-badge">{roleLabel(user.role)}</div>
                  </div>
                </div>

                {/* Email */}
                <span className="osp-row__email">{user.email}</span>

                {/* Role pill */}
                <div>
                  <span
                    className={`osp-role-pill osp-role-pill--${user.role === 'building_manager' ? 'violet' : 'cyan'}`}
                  >
                    {roleLabel(user.role)}
                  </span>
                </div>

                {/* Areas / Buildings */}
                <div className="osp-row__areas">
                  {user.role === 'building_manager' ? (
                    <Select
                      size="small"
                      mode="multiple"
                      value={user.areaIds ?? []}
                      options={areas.map((a) => ({ value: a.id, label: a.name }))}
                      onChange={(next: string[]) => void updateAreas(user, next)}
                      placeholder={
                        areas.length === 0 ? 'Chưa có tòa nhà' : 'Chọn tòa nhà phụ trách...'
                      }
                      style={{ minWidth: 190, width: '100%' }}
                      className="osp-area-select"
                    />
                  ) : (
                    <span className="osp-row__na">Theo gian hàng sở hữu</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <StatusPill status={user.status} />
                </div>

                {/* Actions */}
                <div className="osp-row__actions">
                  <button
                    className={`osp-action-btn osp-action-btn--${user.status === 'active' ? 'warning' : 'success'}`}
                    title={user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                    onClick={() => void toggleStatus(user)}
                  >
                    {user.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
                  </button>
                  <button
                    className="osp-action-btn osp-action-btn--default"
                    title="Đặt lại mật khẩu"
                    onClick={() => void resetPassword(user)}
                  >
                    <ReloadOutlined />
                  </button>
                  <Popconfirm
                    title="Xóa tài khoản này?"
                    description="Thao tác này không thể hoàn tác."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void removeUser(user.id)}
                  >
                    <button className="osp-action-btn osp-action-btn--danger" title="Xóa">
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ── Custom Spatial Glass Create Staff/Manager/StoreOwner Modal ── */}
      {open && (
        <div
          className="swm-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setOpen(false)
            }
          }}
        >
          <div className="swm-card" role="dialog" aria-modal="true">
            <div className="swm-topline" />

            <div className="swm-head">
              <div className="swm-head__left">
                <div
                  className={`swm-badge ${formRole === 'store_owner' ? 'swm-badge--cyan' : ''}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                    {formRole === 'store_owner' ? 'storefront' : 'manage_accounts'}
                  </span>
                </div>
                <div>
                  <h2 className="swm-title">
                    {formRole === 'building_manager'
                      ? 'Thêm Quản lý khu vực mới'
                      : 'Thêm Chủ gian hàng mới'}
                  </h2>
                  <p className="swm-subtitle">
                    {formRole === 'building_manager'
                      ? 'Cấp tài khoản vận hành mặt sàn, bản đồ 2D/3D và thiết bị định vị'
                      : 'Cấp tài khoản đối tác quản lý gian hàng, điểm dịch vụ và khuyến mãi'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="swm-close"
                onClick={() => setOpen(false)}
                disabled={submitting}
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  close
                </span>
              </button>
            </div>

            <form className="swm-form" onSubmit={(e) => void handleCreateSubmit(e)} noValidate>
              {/* 1. Role Selection Cards */}
              <div className="swm-field">
                <label className="swm-label">
                  <span>
                    Vai trò tài khoản <span className="swm-req">*</span>
                  </span>
                </label>
                <div className="swm-role-grid">
                  <button
                    type="button"
                    className={`swm-role-card ${formRole === 'building_manager' ? 'swm-role-card--violet' : ''}`}
                    onClick={() => setFormRole('building_manager')}
                  >
                    <div
                      className="swm-role-card__icon"
                      style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        corporate_fare
                      </span>
                    </div>
                    <div>
                      <p className="swm-role-card__title">Quản lý khu vực</p>
                      <p className="swm-role-card__desc">
                        Vận hành tòa nhà, mặt sàn &amp; bản đồ dẫn đường
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`swm-role-card ${formRole === 'store_owner' ? 'swm-role-card--cyan' : ''}`}
                    onClick={() => setFormRole('store_owner')}
                  >
                    <div
                      className="swm-role-card__icon"
                      style={{ background: 'rgba(34, 211, 238, 0.16)', color: '#67e8f9' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        storefront
                      </span>
                    </div>
                    <div>
                      <p className="swm-role-card__title">Chủ gian hàng</p>
                      <p className="swm-role-card__desc">
                        Quản lý thông tin gian hàng &amp; chương trình ưu đãi
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Display Name Field */}
              <div className="swm-field">
                <label className="swm-label">
                  <span>Họ và tên nhân sự / đối tác</span>
                  <span className="swm-opt">Tùy chọn</span>
                </label>
                <div className="swm-input-wrap">
                  <span className="material-symbols-outlined swm-input-icon">person</span>
                  <input
                    type="text"
                    className="swm-input"
                    placeholder="VD: Nguyễn Văn An"
                    autoComplete="off"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
              </div>

              {/* 3. Email Field */}
              <div className="swm-field">
                <label className="swm-label">
                  <span>
                    Email đăng nhập <span className="swm-req">*</span>
                  </span>
                </label>
                <div className="swm-input-wrap">
                  <span className="material-symbols-outlined swm-input-icon">mail</span>
                  <input
                    type="email"
                    className="swm-input"
                    placeholder="vd: manager@spotway.app"
                    autoComplete="off"
                    value={formEmail}
                    onChange={(e) => {
                      setFormEmail(e.target.value)
                      if (formErrors.email) {
                        setFormErrors((prev) => ({ ...prev, email: undefined }))
                      }
                    }}
                  />
                </div>
                {formErrors.email && (
                  <p className="swm-error">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      error
                    </span>
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* 4. Password Field */}
              <div className="swm-field">
                <label className="swm-label">
                  <span>Mật khẩu khởi tạo</span>
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
                <div className="swm-input-row">
                  <div className="swm-input-wrap">
                    <span className="material-symbols-outlined swm-input-icon">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="swm-input"
                      placeholder="Nhập tối thiểu 8 ký tự (để trống sẽ tự tạo)"
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
                      className="swm-eye-btn"
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
                    className="swm-gen-btn"
                    onClick={() => {
                      setFormPassword(generatePassword())
                      setShowPassword(true)
                      setFormErrors((prev) => ({ ...prev, password: undefined }))
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      auto_fix_high
                    </span>
                    Tạo ngẫu nhiên
                  </button>
                </div>
                {formErrors.password ? (
                  <p className="swm-error">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      error
                    </span>
                    {formErrors.password}
                  </p>
                ) : (
                  <p className="swm-hint">
                    Tối thiểu 8 ký tự. Bạn có thể tự nhập hoặc dùng mật khẩu ngẫu nhiên ở trên.
                  </p>
                )}
              </div>

              {/* 5. Building / Area Assignment for Building Manager */}
              {formRole === 'building_manager' && (
                <div className="swm-field">
                  <label className="swm-label">
                    <span>Phân công Tòa nhà / Khu vực phụ trách</span>
                    <span className="swm-opt">Tùy chọn — có thể gán sau</span>
                  </label>
                  {areas.length === 0 ? (
                    <div className="swm-area-empty">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        info
                      </span>
                      <span>
                        Chưa có tòa nhà nào được tạo. Bạn vẫn có thể tạo Quản lý ngay bây giờ và
                        phân công tòa nhà sau.
                      </span>
                    </div>
                  ) : (
                    <div className="swm-area-grid">
                      {areas.map((area) => {
                        const checked = formAreaIds.includes(area.id)
                        return (
                          <button
                            key={area.id}
                            type="button"
                            className={`swm-area-chip ${checked ? 'swm-area-chip--selected' : ''}`}
                            onClick={() => toggleAreaChip(area.id)}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 7,
                                minWidth: 0,
                              }}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{
                                  fontSize: 17,
                                  color: checked ? '#c4b5fd' : '#958ea0',
                                }}
                              >
                                domain
                              </span>
                              <span
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {area.name}
                              </span>
                            </span>
                            <span
                              className="material-symbols-outlined"
                              style={{
                                fontSize: 18,
                                color: checked ? '#a855f7' : 'rgba(255,255,255,0.2)',
                              }}
                            >
                              {checked ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="swm-footer">
                <button
                  type="button"
                  className="swm-btn"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="swm-btn swm-btn--primary"
                  disabled={submitting}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {submitting ? 'hourglass_top' : 'person_add'}
                  </span>
                  <span>
                    {submitting
                      ? 'Đang khởi tạo...'
                      : formRole === 'building_manager'
                        ? 'Tạo Quản lý khu vực'
                        : 'Tạo Chủ gian hàng'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
