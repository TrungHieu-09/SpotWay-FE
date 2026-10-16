import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Form,
  Modal,
  Upload,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  FileImageOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { updateFloor, uploadFloorPlanImage } from '../../api/floors'
import type { Floor } from '../../types/floor'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024

type UploadFloorPlanModalProps = {
  buildingId: string
  floor: Floor | null
  open: boolean
  onClose: () => void
  onSuccess: (updated: Floor) => void
}

type FormValues = {
  upload?: UploadFile[]
}

export function UploadFloorPlanModal({
  buildingId,
  floor,
  open,
  onClose,
  onSuccess,
}: UploadFloorPlanModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { message } = AntApp.useApp()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setPreviewUrl(null)
      setIsSubmitting(false)
    } else if (floor?.mapImageUrl) {
      setPreviewUrl(floor.mapImageUrl)
    }
  }, [form, open, floor])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (!floor) return null

  async function handleSubmit(values: FormValues) {
    if (!floor) return
    const file = values.upload?.[0]?.originFileObj
    if (!file) {
      message.warning('Vui lòng chọn ảnh sơ đồ')
      return
    }

    setIsSubmitting(true)
    try {
      const uploaded = await uploadFloorPlanImage(buildingId, file)
      const updated = await updateFloor(floor.id, {
        mapImageUrl: uploaded.mapImageUrl,
        mapWidth: uploaded.mapWidth,
        mapHeight: uploaded.mapHeight,
      })

      message.success(`Đã cập nhật sơ đồ ${floor.name} thành công`)
      onSuccess(updated)
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title={`Cập nhật sơ đồ mặt bằng — ${floor.name}`}
      open={open}
      okText={isSubmitting ? 'Đang tải lên...' : 'Lưu sơ đồ'}
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <p style={{ color: 'var(--sw-text-secondary)', marginBottom: 16 }}>
          Tải lên sơ đồ bản vẽ 2D cho <strong>Level {floor.level} ({floor.name})</strong>. Ảnh này sẽ được dùng cho màn hình xem 2D, mô hình 2.5D và Map Editor số hóa lối đi.
        </p>

        <Form.Item
          label="Chọn ảnh sơ đồ mới"
          name="upload"
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          rules={[{ required: !floor.mapImageUrl, message: 'Vui lòng chọn ảnh sơ đồ' }]}
        >
          <Upload
            listType="picture-card"
            maxCount={1}
            beforeUpload={(file) => {
              if (file.size > MAX_IMAGE_SIZE) {
                message.error('Kích thước ảnh tối đa là 10MB')
                return Upload.LIST_IGNORE
              }
              setPreviewUrl(URL.createObjectURL(file))
              return false
            }}
            onRemove={() => {
              setPreviewUrl(floor.mapImageUrl ?? null)
            }}
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>{previewUrl ? 'Đổi ảnh khác' : 'Chọn ảnh'}</div>
            </div>
          </Upload>
        </Form.Item>

        {previewUrl && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--sw-text-muted)', display: 'block', marginBottom: 4 }}>
              <FileImageOutlined /> Sơ đồ hiển thị:
            </span>
            <img
              src={previewUrl}
              alt="Sơ đồ tầng"
              style={{
                maxWidth: '100%',
                maxHeight: 200,
                objectFit: 'contain',
                borderRadius: 8,
                border: '1px solid var(--sw-border)',
                background: '#141424',
              }}
            />
          </div>
        )}
      </Form>
    </Modal>
  )
}
