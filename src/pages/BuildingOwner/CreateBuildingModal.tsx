import { useEffect, useRef, useState } from 'react'
import { App as AntApp } from 'antd'
import { useBuildingStore } from '../../store/useBuildingStore'
import './OwnerStaffPage.css'

const MAX_PLAN_IMAGE_SIZE = 5 * 1024 * 1024

type CreateBuildingModalProps = {
  open: boolean
  onClose: () => void
}

export function CreateBuildingModal({ open, onClose }: CreateBuildingModalProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [planFile, setPlanFile] = useState<File | undefined>(undefined)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ name?: string; address?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const createBuilding = useBuildingStore((state) => state.createBuilding)
  const { message } = AntApp.useApp()

  useEffect(() => {
    if (!open) {
      setName('')
      setAddress('')
      setPlanFile(undefined)
      setPreviewUrl(null)
      setErrors({})
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function handleFileSelect(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.error('Tệp tải lên phải là định dạng hình ảnh (PNG, JPG, WEBP)')
      return
    }
    if (file.size > MAX_PLAN_IMAGE_SIZE) {
      message.error('Ảnh sơ đồ không được vượt quá 5MB')
      return
    }
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPlanFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function clearFile() {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPlanFile(undefined)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: { name?: string; address?: string } = {}
    const trimmedName = name.trim()
    const trimmedAddress = address.trim()

    if (!trimmedName) {
      nextErrors.name = 'Vui lòng nhập tên tòa nhà / trung tâm thương mại'
    }
    if (!trimmedAddress) {
      nextErrors.address = 'Vui lòng nhập địa chỉ tòa nhà'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)
    try {
      await createBuilding({
        name: trimmedName,
        address: trimmedAddress,
        planImage: planFile,
      })
      message.success(`Đã khởi tạo tòa nhà "${trimmedName}" thành công`)
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="swm-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose()
        }
      }}
    >
      <div className="swm-card" role="dialog" aria-modal="true">
        <div className="swm-topline" />

        <div className="swm-head">
          <div className="swm-head__left">
            <div className="swm-badge swm-badge--pink">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                domain_add
              </span>
            </div>
            <div>
              <h2 className="swm-title">Khởi tạo Tòa nhà mới</h2>
              <p className="swm-subtitle">
                Thiết lập cơ sở hạ tầng trung tâm để số hóa mặt sàn 2D/3D và dẫn đường thông minh
              </p>
            </div>
          </div>
          <button
            type="button"
            className="swm-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>

        <form className="swm-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
          {/* 1. Building Name */}
          <div className="swm-field">
            <label className="swm-label">
              <span>
                Tên tòa nhà / Tổ hợp <span className="swm-req">*</span>
              </span>
            </label>
            <div className="swm-input-wrap">
              <span className="material-symbols-outlined swm-input-icon">domain</span>
              <input
                type="text"
                className="swm-input"
                placeholder="VD: Saigon Central Mall, Vincom Thảo Điền..."
                autoComplete="off"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                }}
              />
            </div>
            {errors.name && (
              <p className="swm-error">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  error
                </span>
                {errors.name}
              </p>
            )}
          </div>

          {/* 2. Building Address */}
          <div className="swm-field">
            <label className="swm-label">
              <span>
                Địa chỉ vị trí <span className="swm-req">*</span>
              </span>
            </label>
            <div className="swm-input-wrap">
              <span className="material-symbols-outlined swm-input-icon">location_on</span>
              <input
                type="text"
                className="swm-input"
                placeholder="VD: 72 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM"
                autoComplete="off"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  if (errors.address) setErrors((prev) => ({ ...prev, address: undefined }))
                }}
              />
            </div>
            {errors.address && (
              <p className="swm-error">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                  error
                </span>
                {errors.address}
              </p>
            )}
          </div>

          {/* 3. Optional Floor Plan / Thumbnail Upload */}
          <div className="swm-field">
            <label className="swm-label">
              <span>Ảnh đại diện / Sơ đồ mặt bằng tổng thể</span>
              <span className="swm-opt">Tùy chọn (Tối đa 5MB)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {previewUrl ? (
              <div className="swm-upload-preview">
                <img src={previewUrl} alt="Xem trước ảnh tòa nhà" />
                <div className="swm-upload-preview__bar">
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 300,
                    }}
                  >
                    {planFile?.name}
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    style={{
                      background: 'rgba(248, 113, 113, 0.15)',
                      border: '1px solid rgba(248, 113, 113, 0.35)',
                      color: '#fca5a5',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Gỡ ảnh
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="swm-upload-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFileSelect(e.dataTransfer.files?.[0])
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'rgba(139, 92, 246, 0.16)',
                    color: '#c4b5fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                    cloud_upload
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e3e0f6' }}>
                  Nhấn để chọn ảnh hoặc kéo thả vào đây
                </div>
                <div style={{ fontSize: 11.5, color: '#958ea0' }}>
                  Hỗ trợ PNG, JPG, WEBP — Bạn cũng có thể tải sơ đồ từng tầng sau khi tạo tòa nhà
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="swm-footer">
            <button
              type="button"
              className="swm-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="swm-btn swm-btn--primary"
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {isSubmitting ? 'hourglass_top' : 'add_business'}
              </span>
              <span>{isSubmitting ? 'Đang khởi tạo...' : 'Tạo tòa nhà'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
