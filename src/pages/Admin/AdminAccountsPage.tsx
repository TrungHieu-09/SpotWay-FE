import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'antd'
import { ClearOutlined, SearchOutlined } from '@ant-design/icons'
import {
  deleteAdminUser,
  getAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
} from '../../api/admin'
import type { AdminUser } from '../../types/admin'
import type { Role } from '../../types/auth'
import { AppSelect } from '../../components/ui/AppSelect'
import { PageHeader } from '../../components/ui/PageHeader'

const roleLabels: Record<Role, string> = {
  admin: 'Quản trị viên',
  building_owner: 'Chủ tòa nhà',
  building_manager: 'Quản lý tòa nhà',
  store_owner: 'Chủ gian hàng',
}

const statusLabels: Record<AdminUser['status'], string> = {
  active: 'Hoạt động',
  locked: 'Đã khóa',
}

export function AdminAccountsPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState<Role>()
  const [status, setStatus] = useState<AdminUser['status']>()
  const [tenantName, setTenantName] = useState<string>()
  const [loading, setLoading] = useState(true)
  const { message } = AntApp.useApp()

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setUsers(await getAdminUsers())
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    void reload()
  }, [reload])

  async function toggle(user: AdminUser) {
    try {
      await updateAdminUser(user.id, {
        status: user.status === 'active' ? 'locked' : 'active',
      })
      await reload()
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

  const tenantOptions = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((user) => user.tenantName)
            .filter((value): value is string => Boolean(value)),
        ),
      )
        .sort((first, second) => first.localeCompare(second, 'vi'))
        .map((value) => ({ label: value, value })),
    [users],
  )

  const visibleUsers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('vi-VN')

    return users.filter((user) => {
      const matchesKeyword = normalizedKeyword.length === 0 ||
        [user.name, user.email, user.tenantName ?? '']
          .join(' ')
          .toLocaleLowerCase('vi-VN')
          .includes(normalizedKeyword)

      return (
        matchesKeyword &&
        (!role || user.role === role) &&
        (!status || user.status === status) &&
        (!tenantName || user.tenantName === tenantName)
      )
    })
  }, [keyword, role, status, tenantName, users])

  const hasFilters = Boolean(keyword || role || status || tenantName)

  function clearFilters() {
    setKeyword('')
    setRole(undefined)
    setStatus(undefined)
    setTenantName(undefined)
  }

  return (
    <main className="workspace">
      <PageHeader eyebrow="Quản trị hệ thống" title="Tài khoản" description={`${visibleUsers.length}/${users.length} tài khoản`} />

      <Card className="tool-card admin-account-card">
        <Space className="admin-account-filters" size="middle" wrap>
          <Input.Search
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên, email, doanh nghiệp"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
          />
          <AppSelect
            className="admin-filter-select"
            allowClear
            value={role}
            placeholder="Lọc theo vai trò"
            options={Object.entries(roleLabels).map(([value, label]) => ({ value, label }))}
            notFoundContent={loading ? 'Đang tải...' : 'Không có dữ liệu'}
            onChange={(value) => setRole(value as Role | undefined)}
          />
          <AppSelect
            className="admin-filter-select"
            allowClear
            value={status}
            placeholder="Lọc theo trạng thái"
            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
            notFoundContent={loading ? 'Đang tải...' : 'Không có dữ liệu'}
            onChange={(value) => setStatus(value as AdminUser['status'] | undefined)}
          />
          <AppSelect
            className="admin-filter-select admin-filter-select-wide"
            allowClear
            value={tenantName}
            placeholder="Lọc theo doanh nghiệp"
            options={tenantOptions}
            notFoundContent={loading ? 'Đang tải...' : 'Không có dữ liệu'}
            onChange={(value) => setTenantName(value as string | undefined)}
          />
          <Button
            icon={<ClearOutlined />}
            disabled={!hasFilters}
            onClick={clearFilters}
          >
            Xóa bộ lọc
          </Button>
        </Space>
      </Card>

      <Card className="tool-card">
        <Table<AdminUser>
          rowKey="id"
          loading={loading}
          dataSource={visibleUsers}
          locale={{
            emptyText: hasFilters
              ? 'Không tìm thấy tài khoản phù hợp'
              : 'Chưa có tài khoản',
          }}
          columns={[
            { title: 'Họ tên', dataIndex: 'name' },
            { title: 'Email', dataIndex: 'email' },
            {
              title: 'Doanh nghiệp',
              dataIndex: 'tenantName',
              render: (value: string | null) => value ?? 'Nền tảng',
            },
            {
              title: 'Vai trò',
              dataIndex: 'role',
              render: (value: Role) => roleLabels[value],
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              render: (value: AdminUser['status'], user) => (
                <Button type="link" onClick={() => void toggle(user)}>
                  <Tag color={value === 'active' ? 'green' : 'red'}>
                    {statusLabels[value]}
                  </Tag>
                </Button>
              ),
            },
            {
              title: 'Hành động',
              render: (_value: unknown, user) => (
                <Space wrap>
                  <Button
                    size="small"
                    onClick={async () => {
                      try {
                        const result = await resetAdminUserPassword(user.id)
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
                    okText="Xóa"
                    cancelText="Hủy"
                    onConfirm={() => void remove(user.id)}
                  >
                    <Button danger size="small">
                      Xóa
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </main>
  )
}
