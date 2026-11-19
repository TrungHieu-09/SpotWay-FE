import { useEffect, useRef, useState } from 'react'
import { Alert, Spin } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'

export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const started = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current) return
    started.current = true
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    window.history.replaceState(null, '', url.pathname)
    if (!code) {
      setError('Không tìm thấy mã đăng nhập Google.')
      return
    }
    void useAuthStore.getState().loginWithOAuth(code).then(() => {
      const user = useAuthStore.getState().user
      const target = user?.mustChangePassword ? '/change-password' : user?.role === 'admin' ? '/admin' : user?.role === 'building_owner' ? '/owner/dashboard' : user?.role === 'building_manager' ? '/manager' : user?.role === 'store_owner' ? '/store/profile' : '/account'
      navigate(target, { replace: true })
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Đăng nhập Google thất bại.'))
  }, [navigate])

  return <main className="workspace auth-workspace">{error ? <Alert type="error" message={error} description={<Link to="/login">Quay lại đăng nhập</Link>} showIcon /> : <Spin tip="Đang đăng nhập..." size="large"><div style={{ minHeight: 100 }} /></Spin>}</main>
}
