import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'

export function ForbiddenPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const fallback = user?.role === 'admin' ? '/admin' : user?.role === 'store_owner' ? '/store/profile' : user?.role === 'building_manager' ? '/manager' : '/owner/dashboard'

  return (
    <Result
      status="403"
      title="Bạn không có quyền truy cập"
      subTitle="Vai trò hiện tại không được sử dụng khu vực này."
      extra={<Button type="primary" onClick={() => navigate(fallback)}>Về trang của tôi</Button>}
    />
  )
}
