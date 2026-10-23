import { useEffect, useState } from 'react'
import { App as AntApp, Button, Form, Input, Modal, Popconfirm, Spin, Select } from 'antd'
import {
  PlusOutlined,
  UserOutlined,
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

type FormValues = {
  name: string
  email: string
  role: 'building_manager' | 'store_owner'
  areaIds?: string[]
}

export function OwnerStaffPage() {
  const [users, setUsers] = useState<User[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { message } = AntApp.useApp()
  const location = useLocation()

  const managerView = location.pathname.endsWith('/managers')
  const storeOwnerView = location.pathname.endsWith('/store-owners')
  const title = managerView
    ? 'Quản lý khu vực'
    : storeOwnerView
      ? 'Chủ gian hàng'
      : 'Tài khoản nhân sự'
  const defaultRole: 'building_manager' | 'store_owner' = managerView
    ? 'building_manager'
    : 'store_owner'

  function reload() {
    setLoading(true)
    return Promise.all([getTenantUsers(), getTenantAreas()])
      .then(([nextUsers, nextAreas]) => {
        setUsers(nextUsers)
        setAreas(nextAreas)
      })
      .catch((error: Error) => message.error(error.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [location.pathname])

  async function submit(values: FormValues) {
    setSubmitting(true)
    try {
      const result = await createTenantUser({
        ...values,
        areaIds: values.role === 'building_manager' ? (values.areaIds ?? []) : [],
      })
      message.success(`✅ Đã tạo tài khoản. Mật khẩu tạm: ${result.temporaryPassword}`)
      setOpen(false)
      form.resetFields()
      await reload()
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
      message.success(`🔑 Mật khẩu tạm: ${result.temporaryPassword ?? 'Demo@123'}`)
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
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  const visibleUsers = users
    .filter((u) => u.role === 'building_manager' || u.role === 'store_owner')
    .filter((u) => !managerView || u.role === 'building_manager')
    .filter((u) => !storeOwnerView || u.role === 'store_owner')

  const roleLabel = (role: Role) =>
    role === 'building_manager' ? 'Quản lý tòa nhà' : 'Chủ gian hàng'

  return (
    <main className="workspace osp-workspace">
      {/* ── Header ── */}
      <section className="osp-header">
        <div>
          <span className="osp-header__eyebrow">Building Owner</span>
          <h1 className="osp-header__title">{title}</h1>
          <p className="osp-header__sub">
            Phân quyền, khu vực và tài khoản vận hành của doanh nghiệp.
          </p>
        </div>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields()
            form.setFieldValue('role', defaultRole)
            setOpen(true)
          }}
        >
          Tạo tài khoản
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
            <TeamOutlined className="osp-empty__icon" />
            <p>Chưa có tài khoản nào</p>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields()
                form.setFieldValue('role', defaultRole)
                setOpen(true)
              }}
            >
              Tạo tài khoản đầu tiên
            </Button>
          </div>
        ) : (
          <div className="osp-table">
            <div className="osp-table__head">
              <span>Họ tên</span>
              <span>Email</span>
              <span>Vai trò</span>
              <span>Khu vực</span>
              <span>Trạng thái</span>
              <span>Hành động</span>
            </div>

            {visibleUsers.map((user) => (
              <div key={user.id} className="osp-row">
                {/* Name */}
                <div className="osp-row__name">
                  <div className={`osp-row__avatar osp-row__avatar--${user.role === 'building_manager' ? 'violet' : 'cyan'}`}>
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
                <div className={`osp-role-pill osp-role-pill--${user.role === 'building_manager' ? 'violet' : 'cyan'}`}>
                  {roleLabel(user.role)}
                </div>

                {/* Areas */}
                <div className="osp-row__areas">
                  {user.role === 'building_manager' ? (
                    <Select
                      size="small"
                      mode="multiple"
                      value={user.areaIds ?? []}
                      options={areas.map((a) => ({ value: a.id, label: a.name }))}
                      onChange={(next: string[]) => updateAreas(user, next)}
                      placeholder="Chọn khu vực"
                      style={{ minWidth: 180 }}
                      className="osp-area-select"
                    />
                  ) : (
                    <span className="osp-row__na">Không áp dụng</span>
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
                    onClick={() => toggleStatus(user)}
                  >
                    {user.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
                  </button>
                  <button
                    className="osp-action-btn osp-action-btn--default"
                    title="Đặt lại mật khẩu"
                    onClick={() => resetPassword(user)}
                  >
                    <ReloadOutlined />
                  </button>
                  <Popconfirm
                    title="Xóa tài khoản này?"
                    description="Thao tác này không thể hoàn tác."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => removeUser(user.id)}
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

      {/* ── Create modal ── */}
      <Modal
        title={
          <span className="osp-modal__title">
            <UserOutlined /> Tạo tài khoản mới
          </span>
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Tạo tài khoản"
        cancelText="Hủy"
        confirmLoading={submitting}
        width={480}
        className="osp-modal"
      >
        <Form form={form} layout="vertical" onFinish={submit} className="osp-form">
          <Form.Item
            name="name"
            label="Họ tên"
            rules={[{ required: true, message: 'Nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}
          >
            <Input prefix="@" placeholder="email@company.com" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Chọn vai trò' }]}
          >
            <Select
              disabled={managerView || storeOwnerView}
              options={[
                { value: 'building_manager', label: '🏢 Quản lý tòa nhà' },
                { value: 'store_owner', label: '🏪 Chủ gian hàng' },
              ]}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role !== cur.role}>
            {({ getFieldValue }) =>
              getFieldValue('role') === 'building_manager' ? (
                <Form.Item
                  name="areaIds"
                  label="Khu vực được quản lý"
                  rules={[{ required: true, message: 'Chọn ít nhất một khu vực' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Chọn khu vực..."
                    options={areas.map((a) => ({ value: a.id, label: a.name }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </main>
  )
}
