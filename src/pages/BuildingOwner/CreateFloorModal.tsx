import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Form,
  Input,
  InputNumber,
  Modal,
  Upload,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import {
  FileImageOutlined,
  FontSizeOutlined,
  NumberOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { createFloor, uploadFloorPlanImage } from '../../api/floors'
import type { Floor } from '../../types/floor'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

type CreateFloorModalProps = {
  buildingId: string
  open: boolean
  onClose: () => void
  onSuccess: (floor: Floor) => void
  existingLevels?: number[]
}

type FormValues = {
  level: number
  name: string
  upload?: UploadFile[]
}

export function CreateFloorModal({
  buildingId,
  open,
  onClose,
  onSuccess,
  existingLevels = [],
}: CreateFloorModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const { message } = AntApp.useApp()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setPreviewUrl(null)
      setIsSubmitting(false)
      setLoadingText('')
    } else {
      // Suggest next level
      const nextLevel = existingLevels.length > 0 ? Math.max(...existingLevels) + 1 : 1
      form.setFieldsValue({
        level: nextLevel,
        name: `Tầng ${nextLevel}`,
      })
    }
  }, [form, open, existingLevels])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function handleSubmit(values: FormValues) {
    const file = values.upload?.[0]?.originFileObj

    setIsSubmitting(true)
    try {
      let mapImageUrl: string | null = null
      let mapWidth = 1200
      let mapHeight = 800

      if (file) {
        setLoadingText('Đang tải ảnh sơ đồ lên Supabase Storage...')
        const uploaded = await uploadFloorPlanImage(buildingId, file)
        mapImageUrl = uploaded.mapImageUrl
        mapWidth = uploaded.mapWidth
        mapHeight = uploaded.mapHeight
      }

      setLoadingText('Đang lưu thông tin tầng...')
      const newFloor = await createFloor({
        buildingId,
        level: values.level,
        name: values.name.trim(),
        mapImageUrl,
        mapWidth,
        mapHeight,
      })

      message.success(`Đã thêm ${newFloor.name} thành công`)
      onSuccess(newFloor)
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
      setLoadingText('')
    }
  }

  return (
    <Modal
      title="Thêm tầng mới"
      open={open}
      okText={isSubmitting ? (loadingText || 'Đang tạo...') : 'Tạo tầng'}
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
      forceRender
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Số thứ tự tầng (Level)"
          name="level"
          rules={[
            { required: true, message: 'Vui lòng nhập số tầng' },
            {
              validator: (_, value) => {
                if (existingLevels.includes(value)) {
                  return Promise.reject(new Error(`Tầng ${value} đã tồn tại trong building này`))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <InputNumber
            prefix={<NumberOutlined />}
            style={{ width: '100%' }}
            placeholder="1, 2, 3..."
          />
        </Form.Item>

        <Form.Item
          label="Tên tầng"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên tầng' }]}
        >
          <Input
            prefix={<FontSizeOutlined />}
            placeholder="Tầng 1 - Sảnh chính"
            maxLength={100}
          />
        </Form.Item>

        <Form.Item
          label="Ảnh sơ đồ mặt bằng (2D Floor Plan)"
          name="upload"
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          extra="Hỗ trợ định dạng PNG, JPG, WEBP, SVG (tối đa 10MB). Hệ thống sẽ tự động trích xuất kích thước ảnh."
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
              setPreviewUrl(null)
            }}
          >
            {previewUrl ? null : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Chọn ảnh sơ đồ</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        {previewUrl && (
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--sw-text-muted)', display: 'block', marginBottom: 4 }}>
              <FileImageOutlined /> Xem trước ảnh đã chọn:
            </span>
            <img
              src={previewUrl}
              alt="Preview sơ đồ tầng"
              style={{
                maxWidth: '100%',
                maxHeight: 180,
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
