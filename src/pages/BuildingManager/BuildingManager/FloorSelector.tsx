import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Button,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd'
import type {
  RcFile,
  UploadChangeParam,
  UploadFile,
} from 'antd/es/upload/interface'
import { DeleteOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import type { FloorPublishStatus } from '../../types/floor'
import { compressPlanImageFile } from '../../utils/planRecognition'
import { usePermissions } from '../../auth/usePermissions'
import { getBuildingAreas } from '../../api/areas'
import type { Area } from '../../types/area'

const MAX_PLAN_IMAGE_SIZE = 5 * 1024 * 1024

const { Text } = Typography

type FloorSelectorProps = {
  buildingId?: string
}

type CreateFloorFormValues = {
  name: string
  level: number
  upload?: UploadFile[]
}

function getUploadFileList(event: UploadChangeParam<UploadFile>) {
  return event.fileList
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

function floorStatusColor(status: FloorPublishStatus) {
  return status === 'published' ? 'green' : 'gold'
}

export function FloorSelector({ buildingId }: FloorSelectorProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form] = Form.useForm<CreateFloorFormValues>()
  const [areas, setAreas] = useState<Area[]>([])
  const floors = useFloorStore((state) => state.floors)
  const selectedFloorId = useFloorStore((state) => state.selectedFloorId)
  const isFloorLoading = useFloorStore((state) => state.isFloorLoading)
  const selectFloor = useFloorStore((state) => state.selectFloor)
  const addFloor = useFloorStore((state) => state.addFloor)
  const deleteFloor = useFloorStore((state) => state.deleteFloor)
  const updateFloorStatus = useFloorStore((state) => state.updateFloorStatus)
  const { message } = AntApp.useApp()
  const permissions = usePermissions()
  const canManageFloorStructure = permissions.user?.role === 'building_owner'
  const canDeleteFloor = floors.length > 1

  useEffect(() => {
    if (!buildingId) { setAreas([]); return }
    getBuildingAreas(buildingId).then(setAreas).catch(() => setAreas([]))
  }, [buildingId])

  function closeCreateModal() {
    setIsCreateOpen(false)
    form.resetFields()
  }

  async function handleCreateFloor(values: CreateFloorFormValues) {
    if (!buildingId) {
      return
    }

    try {
      const uploadFile = values.upload?.[0]?.originFileObj
      const compressedImage = uploadFile
        ? await compressPlanImageFile(uploadFile)
        : null

      await addFloor(buildingId, {
        name: values.name,
        level: values.level,
        mapImageUrl: compressedImage?.dataUrl ?? null,
        mapWidth: compressedImage?.width,
        mapHeight: compressedImage?.height,
      })
      message.success('Thêm tầng thành công')
      closeCreateModal()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function handleDeleteFloor(floorId: string) {
    try {
      await deleteFloor(floorId)
      message.success('Xoá tầng thành công')
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  async function handleToggleStatus(
    floorId: string,
    isPublished: boolean,
  ) {
    try {
      await updateFloorStatus(
        floorId,
        isPublished ? 'published' : 'draft',
      )
      message.success('Cập nhật trạng thái tầng thành công')
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return (
    <section className="floor-selector">
      <div className="floor-selector-header">
        <Text strong>Tầng</Text>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          disabled={!buildingId || !canManageFloorStructure}
          onClick={() => setIsCreateOpen(true)}
        />
      </div>

      <Spin spinning={isFloorLoading}>
        {floors.length > 0 ? (
          <div className="floor-list">
            {floors.map((floor) => (
              (() => {
                const canEdit = permissions.canEditFloor(floor)
                return (
              <div
                key={floor.id}
                className={
                  floor.id === selectedFloorId
                    ? 'floor-list-item floor-list-item-active'
                    : 'floor-list-item'
                }
                onClick={() => selectFloor(floor.id)}
              >
                <div className="floor-list-main">
                  <Space size={6} wrap>
                    <Text strong>{floor.name}</Text>
                    <Tag color={floorStatusColor(floor.publishStatus)}>
                      {floor.publishStatus === 'published'
                        ? 'Đã xuất bản'
                        : 'Bản nháp'}
                    </Tag>
                    <Tag color={floor.areaId ? areas.find((area) => area.id === floor.areaId)?.color : 'default'}>
                      {areas.find((area) => area.id === floor.areaId)?.name ?? 'Chưa phân khu vực'}
                    </Tag>
                    {!canEdit ? <Tooltip title="Bạn chỉ có quyền xem tầng ngoài khu vực được gán"><Tag icon={<LockOutlined />}>Chỉ xem</Tag></Tooltip> : null}
                  </Space>
                  <Text type="secondary">Tầng {floor.level}</Text>
                </div>

                <div
                  className="floor-list-actions"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Tag>{floor.pois.length} POI</Tag>
                  <Tag color={floor.mapImageUrl ? 'blue' : 'default'}>
                    {floor.mapImageUrl ? 'Có sơ đồ' : 'Chưa ảnh'}
                  </Tag>
                  <Switch
                    size="small"
                    checked={floor.publishStatus === 'published'}
                    disabled={isFloorLoading || !canEdit}
                    onChange={(checked) => handleToggleStatus(floor.id, checked)}
                  />
                  <Tooltip
                    title={
                      canDeleteFloor
                        ? undefined
                        : 'Tòa nhà phải có ít nhất 1 tầng'
                    }
                  >
                    <Popconfirm
                      title={`Xoá tầng ${floor.name}?`}
                      description="Toàn bộ POI của tầng này cũng sẽ bị xoá."
                      okText="Xoá"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      disabled={!canDeleteFloor}
                      onConfirm={() => handleDeleteFloor(floor.id)}
                    >
                      <Button
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        disabled={!canDeleteFloor || isFloorLoading || !canManageFloorStructure}
                      />
                    </Popconfirm>
                  </Tooltip>
                </div>
              </div>
                )
              })()
            ))}
          </div>
        ) : (
          <Empty description="Chưa có tầng" />
        )}
      </Spin>

      <Modal
        title="Thêm tầng mới"
        open={isCreateOpen}
        okText="Thêm tầng"
        cancelText="Hủy"
        confirmLoading={isFloorLoading}
        onOk={() => form.submit()}
        onCancel={closeCreateModal}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleCreateFloor}>
          <Form.Item
            label="Tên tầng"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên tầng' }]}
          >
            <Input placeholder="Tầng 5" />
          </Form.Item>

          <Form.Item
            label="Số tầng"
            name="level"
            rules={[
              { required: true, message: 'Vui lòng nhập số tầng' },
              {
                validator: (_, value: number | null | undefined) => {
                  if (value === null || value === undefined) {
                    return Promise.resolve()
                  }

                  const hasSameLevel = floors.some(
                    (floor) => floor.level === value,
                  )
                  return hasSameLevel
                    ? Promise.reject(new Error('Số tầng này đã tồn tại'))
                    : Promise.resolve()
                },
              },
            ]}
          >
            <InputNumber className="full-width" precision={0} />
          </Form.Item>

          <Form.Item
            label="Ảnh sơ đồ tầng"
            name="upload"
            valuePropName="fileList"
            getValueFromEvent={getUploadFileList}
          >
            <Upload
              accept="image/*"
              beforeUpload={(file) => validatePlanFile(file, message.error)}
              maxCount={1}
              listType="picture-card"
            >
              <div className="upload-card-trigger">
                <PlusOutlined />
                <span>Upload</span>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
