import { useEffect, useState } from 'react'
import { App as AntApp, Form, Input, Modal, Upload } from 'antd'
import type { RcFile, UploadFile } from 'antd/es/upload/interface'
import {
  BankOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useBuildingStore } from '../../store/useBuildingStore'
import type { CreateBuildingPayload } from '../../types/building'

const MAX_PLAN_IMAGE_SIZE = 5 * 1024 * 1024

type CreateBuildingModalProps = {
  open: boolean
  onClose: () => void
}

type BuildingFormValues = Omit<CreateBuildingPayload, 'planImage'> & {
  upload?: UploadFile[]
}

export function CreateBuildingModal({
  open,
  onClose,
}: CreateBuildingModalProps) {
  const [form] = Form.useForm<BuildingFormValues>()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createBuilding = useBuildingStore((state) => state.createBuilding)
  const { message } = AntApp.useApp()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setPreviewUrl(null)
    }
  }, [form, open])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function handleSubmit(values: BuildingFormValues) {
    const file = values.upload?.[0]?.originFileObj

    setIsSubmitting(true)
    try {
      await createBuilding({
        name: values.name,
        address: values.address,
        planImage: file,
      })
      message.success('Tạo building thành công')
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="Tạo building mới"
      open={open}
      okText="Tạo building"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Tên building"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên building' }]}
        >
          <Input prefix={<BankOutlined />} placeholder="Saigon Central Mall" />
        </Form.Item>

        <Form.Item
          label="Địa chỉ"
          name="address"
          rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
        >
          <Input
            prefix={<EnvironmentOutlined />}
            placeholder="72 Le Loi, District 1"
          />
        </Form.Item>

        <Form.Item
          label="Ảnh sơ đồ 2D"
          name="upload"
          valuePropName="fileList"
          getValueFromEvent={(event) => event?.fileList}
        >
          <Upload
            accept="image/*"
            beforeUpload={(file) => {
              if (!file.type.startsWith('image/')) {
                message.error('File upload phải là ảnh')
                return Upload.LIST_IGNORE
              }

              if (file.size > MAX_PLAN_IMAGE_SIZE) {
                message.error('Ảnh sơ đồ không được vượt quá 5MB')
                return Upload.LIST_IGNORE
              }

              return false
            }}
            maxCount={1}
            listType="picture-card"
            onChange={({ fileList }) => {
              const file = fileList[0]?.originFileObj
              setPreviewUrl(file ? URL.createObjectURL(file as RcFile) : null)
            }}
          >
            <div className="upload-card-trigger">
              <PlusOutlined />
              <span>Upload</span>
            </div>
          </Upload>
        </Form.Item>

        {previewUrl ? (
          <img
            className="plan-preview"
            src={previewUrl}
            alt="Preview ảnh sơ đồ 2D"
          />
        ) : null}
      </Form>
    </Modal>
  )
}
