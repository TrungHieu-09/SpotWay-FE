import { useState, useEffect, useRef } from 'react'
import { App as AntApp } from 'antd'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import { resendOtp } from '../../auth/api'
import './EmailVerifyPage.css'

export function EmailVerifyPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { message } = AntApp.useApp()

  // Location state or URL param
  const stateEmail = (location.state as { email?: string; demoCode?: string })?.email
  const stateDemoCode = (location.state as { email?: string; demoCode?: string })?.demoCode
  const paramEmail = searchParams.get('email')

  const initialEmail = stateEmail || paramEmail || 'user@spotway.io'
  const [email, setEmail] = useState(initialEmail)
  const [demoCode, setDemoCode] = useState<string | null>(stateDemoCode || '123456')

  // 6-digit OTP boxes state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(60)
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [tempEmail, setTempEmail] = useState(initialEmail)

  const user = useAuthStore((state) => state.user)
  const verifyEmail = useAuthStore((state) => state.verifyEmail)

  // Redirect if user is already verified & authenticated
  useEffect(() => {
    if (user) {
      navigate('/onboarding', { replace: true })
    }
  }, [user, navigate])

  // Countdown timer for resend OTP
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Focus the first empty input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Handle single digit input
  const handleInputChange = (index: number, value: string) => {
    setErrorMessage(null)
    // Only keep numeric digits
    const cleanVal = value.replace(/\D/g, '')

    if (!cleanVal) {
      const nextOtp = [...otp]
      nextOtp[index] = ''
      setOtp(nextOtp)
      return
    }

    // If multiple digits (e.g. autofill), distribute across inputs
    if (cleanVal.length > 1) {
      const nextOtp = [...otp]
      const digits = cleanVal.slice(0, 6).split('')
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          nextOtp[index + i] = digit
        }
      })
      setOtp(nextOtp)
      const nextFocus = Math.min(index + digits.length, 5)
      inputRefs.current[nextFocus]?.focus()
      return
    }

    // Single digit
    const nextOtp = [...otp]
    nextOtp[index] = cleanVal
    setOtp(nextOtp)

    // Automatically focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle backspace and arrow navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  // Handle paste full OTP
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const nextOtp = [...otp]
    pasted.split('').forEach((char, idx) => {
      nextOtp[idx] = char
    })
    setOtp(nextOtp)

    const focusIdx = Math.min(pasted.length, 5)
    inputRefs.current[focusIdx]?.focus()
  }

  // Quick fill demo code helper
  const handleQuickFill = () => {
    if (!demoCode) return
    const digits = demoCode.slice(0, 6).split('')
    setOtp(digits)
    setErrorMessage(null)
    message.success(`Đã điền mã xác thực: ${demoCode}`)
    inputRefs.current[5]?.focus()
  }

  // Resend OTP handler
  const handleResend = async () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    setErrorMessage(null)

    try {
      const res = await resendOtp(email)
      setCooldown(60)
      if (res?.demoCode) {
        setDemoCode(res.demoCode)
      }
      message.success('Mã xác thực mới đã được gửi đến email của bạn!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể gửi lại mã. Vui lòng thử lại.'
      setErrorMessage(msg)
    } finally {
      setResending(false)
    }
  }

  // Submit OTP Verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const code = otp.join('').trim()
    if (code.length < 6) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số mã xác thực.')
      return
    }

    setSubmitting(true)
    try {
      await verifyEmail(email.trim(), code)
      message.success('Xác thực email thành công! Chào mừng bạn đến với SpotWay.')
      navigate('/onboarding', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Mã xác thực không hợp lệ hoặc đã hết hạn.'
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Save edited email
  const handleSaveEmail = () => {
    if (!tempEmail.trim() || !tempEmail.includes('@')) {
      message.error('Vui lòng nhập địa chỉ email hợp lệ.')
      return
    }
    setEmail(tempEmail.trim())
    setIsEditingEmail(false)
    setCooldown(0) // Allow instant resend
    message.info('Đã cập nhật email. Vui lòng bấm "Gửi lại mã" để nhận mã cho email mới.')
  }

  const isOtpComplete = otp.every((digit) => digit.length === 1)

  return (
    <div className="ev-root">
      {/* ── Background Grids & Ambient Auroras ── */}
      <div className="ev-grid" />
      <div className="ev-bloom ev-bloom--top" />
      <div className="ev-bloom ev-bloom--bottom" />

      {/* ── Top Header Navigation ── */}
      <header className="ev-topbar">
        <Link to="/" className="ev-brand" title="Trang chủ SpotWay">
          <div className="ev-brand__icon">
            <span className="material-symbols-outlined">deployed_code</span>
          </div>
          <span className="ev-brand__name">SpotWay</span>
        </Link>

        <div className="ev-topbar__action">
          <Link to="/login" className="ev-topbar__link">
            <span>Đã có tài khoản?</span>
            <strong>Đăng nhập</strong>
          </Link>
        </div>
      </header>

      {/* ── Main Verification Card ── */}
      <main className="ev-container">
        <div className="ev-card">
          {/* Badge Icon */}
          <div className="ev-badge">
            <div className="ev-badge__pulse" />
            <div className="ev-badge__inner">
              <span className="material-symbols-outlined">mark_email_read</span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="ev-title">Xác thực địa chỉ Email</h1>
          <p className="ev-subtitle">
            Hệ thống đã gửi mã xác nhận bảo mật gồm <strong>6 chữ số</strong> tới hòm thư của bạn:
          </p>

          {/* Target Email Banner */}
          <div className="ev-email-box">
            {isEditingEmail ? (
              <div className="ev-email-edit">
                <input
                  type="email"
                  className="ev-email-input"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  placeholder="Nhập email của bạn..."
                  autoFocus
                />
                <button
                  type="button"
                  className="ev-btn-icon ev-btn-icon--save"
                  onClick={handleSaveEmail}
                  title="Lưu email"
                >
                  <span className="material-symbols-outlined">check</span>
                </button>
                <button
                  type="button"
                  className="ev-btn-icon"
                  onClick={() => {
                    setTempEmail(email)
                    setIsEditingEmail(false)
                  }}
                  title="Hủy"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            ) : (
              <div className="ev-email-display">
                <span className="material-symbols-outlined ev-email-icon">mail</span>
                <span className="ev-email-text">{email}</span>
                <button
                  type="button"
                  className="ev-email-change-btn"
                  onClick={() => setIsEditingEmail(true)}
                  title="Đổi email nhận mã"
                >
                  <span className="material-symbols-outlined">edit</span>
                  <span>Đổi</span>
                </button>
              </div>
            )}
          </div>

          {/* Demo Mode Notice Box */}
          {demoCode && (
            <div className="ev-demo-banner">
              <div className="ev-demo-banner__left">
                <div className="ev-demo-pill">
                  <span className="material-symbols-outlined">science</span>
                  <span>Chế độ Demo</span>
                </div>
                <div className="ev-demo-code-text">
                  Mã OTP của bạn là: <strong className="ev-demo-code">{demoCode}</strong>
                </div>
              </div>
              <button
                type="button"
                className="ev-demo-fill-btn"
                onClick={handleQuickFill}
                title="Tự động điền mã xác thực"
              >
                <span className="material-symbols-outlined">bolt</span>
                <span>Điền nhanh</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="ev-alert ev-alert--error" role="alert">
              <span className="material-symbols-outlined">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleSubmit} className="ev-form">
            <div className="ev-otp-group">
              <label className="ev-otp-label">Nhập 6 chữ số mã xác thực</label>
              <div className="ev-otp-inputs">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    className={`ev-otp-input ${digit ? 'ev-otp-input--filled' : ''}`}
                    value={digit}
                    onChange={(e) => handleInputChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`ev-submit-btn ${submitting ? 'ev-submit-btn--loading' : ''}`}
              disabled={submitting || !isOtpComplete}
            >
              {submitting ? (
                <>
                  <span className="ev-spinner" />
                  <span>Đang xác thực mã...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận &amp; Kích hoạt tài khoản</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Resend OTP Section */}
          <div className="ev-resend">
            <span className="ev-resend__text">Chưa nhận được mã?</span>
            {cooldown > 0 ? (
              <span className="ev-resend__countdown">
                <span className="material-symbols-outlined">schedule</span>
                Gửi lại sau <strong>{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                className="ev-resend__btn"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Đang gửi...' : 'Gửi lại mã xác thực'}
              </button>
            )}
          </div>

          {/* Footer Back Link */}
          <div className="ev-footer">
            <Link to="/register" className="ev-footer__link">
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Quay lại trang Đăng ký</span>
            </Link>
          </div>
        </div>

        {/* Security / Help footnote */}
        <div className="ev-footnote">
          <span className="material-symbols-outlined">lock</span>
          <span>Mã bảo mật có hiệu lực trong vòng 15 phút. Không chia sẻ mã OTP với người khác.</span>
        </div>
      </main>
    </div>
  )
}

export default EmailVerifyPage

