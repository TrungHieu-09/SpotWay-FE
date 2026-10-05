import { useState } from 'react'
import {
  App as AntApp,
  Button,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import type { FloorPublishStatus } from '../../types/floor'

const { Text } = Typography

type FloorSelectorProps = {
  buildingId?: string
}

type CreateFloorFormValues = {
  name: string
  level: number
}

function floorStatusColor(status: FloorPublishStatus) {
  return status === 'published' ? 'green' : 'gold'
}

export function FloorSelector({ buildingId }: FloorSelectorProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form] = Form.useForm<CreateFloorFormValues>()
  const floors = useFloorStore((state) => state.floors)
  const selectedFloorId = useFloorStore((state) => state.selectedFloorId)
  const isFloorLoading = useFloorStore((state) => state.isFloorLoading)
  const selectFloor = useFloorStore((state) => state.selectFloor)
  const addFloor = useFloorStore((state) => state.addFloor)
  const deleteFloor = useFloorStore((state) => state.deleteFloor)
  const updateFloorStatus = useFloorStore((state) => state.updateFloorStatus)
  const { message } = AntApp.useApp()
  const canDeleteFloor = floors.length > 1

  function closeCreateModal() {
    setIsCreateOpen(false)
    form.resetFields()
  }

  async function handleCreateFloor(values: CreateFloorFormValues) {
    if (!buildingId) {
      return
    }

    try {
      await addFloor(buildingId, values)
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
        <Text strong>Floors</Text>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          disabled={!buildingId}
          onClick={() => setIsCreateOpen(true)}
        />
      </div>

      <Spin spinning={isFloorLoading}>
        <List
          dataSource={floors}
          locale={{ emptyText: 'Chưa có tầng' }}
          renderItem={(floor) => (
            <List.Item
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
                    {floor.publishStatus}
                  </Tag>
                </Space>
                <Text type="secondary">Level {floor.level}</Text>
              </div>

              <div
                className="floor-list-actions"
                onClick={(event) => event.stopPropagation()}
              >
                <Tag>{floor.pois.length} POI</Tag>
                <Switch
                  size="small"
                  checked={floor.publishStatus === 'published'}
                  disabled={isFloorLoading}
                  onChange={(checked) => handleToggleStatus(floor.id, checked)}
                />
                <Tooltip
                  title={
                    canDeleteFloor
                      ? undefined
                      : 'Building phải có ít nhất 1 tầng'
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
                      disabled={!canDeleteFloor || isFloorLoading}
                    />
                  </Popconfirm>
                </Tooltip>
              </div>
            </List.Item>
          )}
        />
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
            label="Level"
            name="level"
            rules={[
              { required: true, message: 'Vui lòng nhập level' },
              {
                validator: (_, value: number | null | undefined) => {
                  if (value === null || value === undefined) {
                    return Promise.resolve()
                  }

                  const hasSameLevel = floors.some(
                    (floor) => floor.level === value,
                  )
                  return hasSameLevel
                    ? Promise.reject(new Error('Level này đã tồn tại'))
                    : Promise.resolve()
                },
              },
            ]}
          >
            <InputNumber className="full-width" precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}
