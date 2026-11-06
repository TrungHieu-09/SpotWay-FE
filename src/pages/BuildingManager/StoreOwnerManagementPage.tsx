import { useCallback, useEffect, useState } from 'react'
import { App as AntApp, Button, Card, Popconfirm, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  createStoreOwner,
  deleteStoreOwner,
  getStoreOwners,
  resetStoreOwnerPassword,
  updateStoreOwner,
  type StoreOwnerSummary,
} from '../../api/storeOwners'
import type { User } from '../../types/auth'
import '../BuildingOwner/OwnerStaffPage.css'

export function StoreOwnerManagementPage() {
  const [users, setUsers] = useState<StoreOwnerSummary[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>()
  const { message, modal } = AntApp.useApp()

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await getStoreOwners())
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    void reload()
  }, [reload])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Vui lòng nhập email hợp lệ')
      return
    }
    setEmailError(undefined)
    setSubmitting(true)
    try {
      const result = await createStoreOwner({
        name: name.trim() || trimmedEmail.split('@')[0],
        email: trimmedEmail,
      })
      setOpen(false)
      setName('')
      setEmail('')
      await reload()
      modal.success({
        title: 'Đã tạo tài khoản Chủ gian hàng',
        content: (
          <div style={{ marginTop: 8 }}>
            <p>
              Tài khoản <strong>{result.email}</strong> đã được tạo. Mật khẩu tạm:
            </p>
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

  return (
    <main className="workspace">
      <div className="page-heading">
        <div>
          <Typography.Text type="secondary">Quản lý tòa nhà</Typography.Text>
          <Typography.Title level={1}>Chủ gian hàng</Typography.Title>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setName('')
            setEmail('')
            setEmailError(undefined)
            setOpen(true)
          }}
        >
          Tạo chủ gian hàng
        </Button>
      </div>
      <Card className="tool-card">
        <Table<StoreOwnerSummary>
          rowKey="id"
          loading={loading}
          dataSource={users}
          locale={{ emptyText: 'Chưa có chủ gian hàng' }}
          columns={[
            { title: 'Họ tên', dataIndex: 'name' },
            { title: 'Email', dataIndex: 'email' },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              render: (status: User['status'], user) => (
                <Button
                  type="link"
                  onClick={() =>
                    updateStoreOwner(user.id, status === 'active' ? 'locked' : 'active')
                      .then(reload)
                      .catch((error: Error) => message.error(error.message))
                  }
                >
                  <Tag color={status === 'active' ? 'green' : 'red'}>
                    {status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                  </Tag>
                </Button>
              ),
            },
            { title: 'Gian hàng', dataIndex: 'storeCount' },
            {
              title: 'Thao tác',
              render: (_value, user) => (
                <Space>
                  <Button
                    size="small"
                    onClick={async () => {
                      try {
                        const result = await resetStoreOwnerPassword(user.id)
                        message.success(`Mật khẩu tạm: ${result.temporaryPassword}`)
                      } catch (error) {
                        message.error((error as Error).message)
                      }
                    }}
                  >
                    Đặt lại mật khẩu
                  </Button>
                  <Popconfirm
                    title="Xóa tài khoản này?"
                    onConfirm={() =>
                      deleteStoreOwner(user.id)
                        .then(reload)
                        .catch((error: Error) => message.error(error.message))
                    }
                  >
                    <Button danger size="small" disabled={user.storeCount > 0}>
                      Xóa
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

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
                <div className="swm-badge swm-badge--cyan">
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                    storefront
                  </span>
                </div>
                <div>
                  <h2 className="swm-title">Thêm Chủ gian hàng mới</h2>
                  <p className="swm-subtitle">
                    Khởi tạo tài khoản đối tác quản lý gian hàng và ưu đãi
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="swm-close"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  close
                </span>
              </button>
            </div>

            <form className="swm-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
              <div className="swm-field">
                <label className="swm-label">
                  <span>Họ và tên chủ gian hàng</span>
                  <span className="swm-opt">Tùy chọn</span>
                </label>
                <div className="swm-input-wrap">
                  <span className="material-symbols-outlined swm-input-icon">person</span>
                  <input
                    type="text"
                    className="swm-input"
                    placeholder="VD: Trần Thị B"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

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
                    placeholder="store@spotway.app"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (emailError) setEmailError(undefined)
                    }}
                  />
                </div>
                {emailError && (
                  <p className="swm-error">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      error
                    </span>
                    {emailError}
                  </p>
                )}
              </div>

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
                  <span>{submitting ? 'Đang tạo...' : 'Tạo Chủ gian hàng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
