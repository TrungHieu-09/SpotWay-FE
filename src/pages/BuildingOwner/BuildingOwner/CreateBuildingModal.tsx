import { useState } from 'react'
import {
  App as AntApp,
  Alert,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Typography,
  Upload,
} from 'antd'
import type {
  RcFile,
  UploadChangeParam,
  UploadFile,
} from 'antd/es/upload/interface'
import {
  BankOutlined,
  EnvironmentOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useBuildingStore } from '../../store/useBuildingStore'
import { compressPlanImageFile } from '../../utils/planRecognition'
import type { CreateBuildingPayload } from '../../types/building'

const MAX_PLAN_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_FLOOR_COUNT = 20

const { Text } = Typography

type CreateBuildingModalProps = {
  open: boolean
  onClose: () => void
}

type FloorPlanFormValue = {
  upload?: UploadFile[]
}

type BuildingFormValues = {
  name: string
  address: string
  floorCount?: number
  floors?: FloorPlanFormValue[]
}

function getUploadFileList(event: UploadChangeParam<UploadFile>) {
  return event.fileList
}

function normalizeFloorCount(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) {
    return 1
  }

  return Math.min(MAX_FLOOR_COUNT, Math.max(1, Math.trunc(value)))
}

function validatePlanFile(file: RcFile, showError: (content: string) => void) {
  if (!file.type.startsWith('image/')) {
    showError('File upload phải là ảnh')
    return Upload.LIST_IGNORE
  }

  if (file.size > MAX_PLAN_IMAGE_SIZE) {
    showError('Ảnh sơ đồ không được vượt quá 5MB')
    return Upload.LIST_IGNORE
  }

  return false
}

export function CreateBuildingModal({
  open,
  onClose,
}: CreateBuildingModalProps) {
  const [form] = Form.useForm<BuildingFormValues>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createBuilding = useBuildingStore((state) => state.createBuilding)
  const { message } = AntApp.useApp()
  const watchedFloorCount = Form.useWatch('floorCount', form)
  const floorCount = normalizeFloorCount(watchedFloorCount)

  async function buildFloorPayloads(values: BuildingFormValues) {
    const floors: CreateBuildingPayload['floors'] = []

    for (let index = 0; index < floorCount; index += 1) {
      const uploadFile = values.floors?.[index]?.upload?.[0]?.originFileObj
      const compressedImage = uploadFile
        ? await compressPlanImageFile(uploadFile)
        : null

      floors.push({
        name: `Tầng ${index + 1}`,
        level: index + 1,
        mapImageUrl: compressedImage?.dataUrl ?? null,
        mapWidth: compressedImage?.width,
        mapHeight: compressedImage?.height,
      })
    }

    return floors
  }

  async function handleSubmit(values: BuildingFormValues) {
    setIsSubmitting(true)
    try {
      const floors = await buildFloorPayloads(values)
      await createBuilding({
        name: values.name,
        address: values.address,
        floors,
      })
      message.success('Tạo tòa nhà thành công')
      onClose()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="Tạo tòa nhà mới"
      open={open}
      okText="Tạo tòa nhà"
      cancelText="Hủy"
      confirmLoading={isSubmitting}
      onOk={() => form.submit()}
      onCancel={onClose}
      afterOpenChange={(visible) => {
        if (!visible) {
          form.resetFields()
        }
      }}
      destroyOnHidden
      forceRender
      width={760}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ floorCount: 1 }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Tên tòa nhà"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên tòa nhà' }]}
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
          label="Số lượng tầng"
          name="floorCount"
          rules={[
            { required: true, message: 'Vui lòng nhập số lượng tầng' },
          ]}
        >
          <InputNumber
            className="full-width"
            min={1}
            max={MAX_FLOOR_COUNT}
            precision={0}
          />
        </Form.Item>

        <Alert
          showIcon
          className="building-floor-upload-note"
          type="info"
          message="Có thể upload sơ đồ riêng cho từng tầng. Tầng chưa có ảnh vẫn được tạo và có thể upload sau trong màn Building Manager."
        />

        <div className="building-floor-upload-grid">
          {Array.from({ length: floorCount }, (_, index) => (
            <div className="building-floor-upload-item" key={index}>
              <Space
                className="full-width"
                orientation="vertical"
                size={8}
              >
                <Text strong>{`Tầng ${index + 1}`}</Text>
                <Form.Item
                  name={['floors', index, 'upload']}
                  valuePropName="fileList"
                  getValueFromEvent={getUploadFileList}
                  noStyle
                >
                  <Upload
                    accept="image/*"
                    beforeUpload={(file) =>
                      validatePlanFile(file, message.error)
                    }
                    maxCount={1}
                    listType="picture-card"
                  >
                    <div className="upload-card-trigger">
                      <PlusOutlined />
                      <span>Upload</span>
                    </div>
                  </Upload>
                </Form.Item>
              </Space>
            </div>
          ))}
        </div>
      </Form>
    </Modal>
  )
}
