import { useEffect, useState } from 'react'
import { App as AntApp } from 'antd'
import { assignManagerByEmail, createAndAssignManager } from '../../api/buildings'
import './OwnerStaffPage.css'

function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const letters = Array.from(bytes.slice(0, 8), (b) => alphabet[b % alphabet.length]).join('')
  const digits = Array.from(bytes.slice(8), (b) => String(b % 10)).join('')
  return `${letters}@${digits}`
}

export function AssignManagerModal({
  buildingId,
  open,
  onClose,
}: {
  buildingId: string
  open: boolean
  onClose: () => void
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const { message } = AntApp.useApp()

  useEffect(() => {
    if (open) {
      setMode('existing')
      setEmail('')
      setPassword(generatePassword())
      setShowPassword(true)
      setErrors({})
    }
  }, [open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: { email?: string; password?: string } = {}
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Vui lòng nhập email Quản lý hợp lệ'
    }
    if (mode === 'new' && password.trim().length < 8) {
      nextErrors.password = 'Mật khẩu cần tối thiểu 8 ký tự'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      if (mode === 'new') {
        await createAndAssignManager(buildingId, trimmedEmail, password.trim())
        message.success('Đã tạo tài khoản và gán Quản lý vào tòa nhà thành công.')
      } else {
        await assignManagerByEmail(buildingId, trimmedEmail)
        message.success('Đã gán Quản lý vào tòa nhà thành công.')
      }
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="swm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose()
        }
      }}
    >
      <div className="swm-card" role="dialog" aria-modal="true">
        <div className="swm-topline" />

        <div className="swm-head">
          <div className="swm-head__left">
            <div className="swm-badge">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                badge
              </span>
            </div>
            <div>
              <h2 className="swm-title">Gán Quản lý Tòa nhà</h2>
              <p className="swm-subtitle">
                Phân quyền cho nhân sự quản lý mặt sàn và bản đồ của tòa nhà này
              </p>
            </div>
          </div>
          <button
            type="button"
            className="swm-close"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>

        <form className="swm-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <div className="swm-field">
            <label className="swm-label">
              <span>Hình thức phân công</span>
            </label>
            <div className="swm-role-grid">
              <button
                type="button"
                className={`swm-role-card ${mode === 'existing' ? 'swm-role-card--violet' : ''}`}
                onClick={() => setMode('existing')}
              >
                <div
                  className="swm-role-card__icon"
                  style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    person_check
                  </span>
                </div>
                <div>
                  <p className="swm-role-card__title">Quản lý đã có tài khoản</p>
                  <p className="swm-role-card__desc">Gán bằng địa chỉ email hiện có</p>
                </div>
              </button>

              <button
                type="button"
                className={`swm-role-card ${mode === 'new' ? 'swm-role-card--cyan' : ''}`}
                onClick={() => setMode('new')}
              >
                <div
                  className="swm-role-card__icon"
                  style={{ background: 'rgba(34, 211, 238, 0.16)', color: '#67e8f9' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    person_add
                  </span>
                </div>
                <div>
                  <p className="swm-role-card__title">Tạo Quản lý mới</p>
                  <p className="swm-role-card__desc">Tạo tài khoản và gán ngay vào tòa nhà</p>
                </div>
              </button>
            </div>
          </div>

          <div className="swm-field">
            <label className="swm-label">
              <span>
                Email Quản lý <span className="swm-req">*</span>
              </span>
            </label>
            <div className="swm-input-wrap">
              <span className="material-symbols-outlined swm-input-icon">mail</span>
              <input
                type="email"
                className="swm-input"
                placeholder="manager@spotway.app"
                autoComplete="off"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                }}
              />
            </div>
            {errors.email ? (
              <p className="swm-error">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  error
                </span>
                {errors.email}
              </p>
            ) : (
              <p className="swm-hint">
                Tài khoản Quản lý phải thuộc cùng không gian doanh nghiệp của bạn.
              </p>
            )}
          </div>

          {mode === 'new' && (
            <div className="swm-field">
              <label className="swm-label">
                <span>
                  Mật khẩu khởi tạo <span className="swm-req">*</span>
                </span>
              </label>
              <div className="swm-input-row">
                <div className="swm-input-wrap">
                  <span className="material-symbols-outlined swm-input-icon">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="swm-input"
                    placeholder="Tối thiểu 8 ký tự..."
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                    }}
                  />
                  <button
                    type="button"
                    className="swm-eye-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
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
                    setPassword(generatePassword())
                    setShowPassword(true)
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    auto_fix_high
                  </span>
                  Tạo ngẫu nhiên
                </button>
              </div>
              {errors.password && (
                <p className="swm-error">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                    error
                  </span>
                  {errors.password}
                </p>
              )}
            </div>
          )}

          <div className="swm-footer">
            <button
              type="button"
              className="swm-btn"
              onClick={onClose}
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
                {submitting ? 'hourglass_top' : 'check'}
              </span>
              <span>{submitting ? 'Đang xử lý...' : 'Gán Quản lý'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
