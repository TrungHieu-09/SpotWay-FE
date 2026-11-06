import { useState } from 'react'
import './FloorSelector.css'
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
import { CheckCircleOutlined, ColumnWidthOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { validateFloorGraph } from '../../api/floors'
import { useFloorStore } from '../../store/useFloorStore'
import { usePoiStore } from '../../store/usePoiStore'
import type { Floor, FloorPublishStatus } from '../../types/floor'
import { describePublishError, hintFor } from '../../utils/publishIssues'
import { FloorCalibrationModal } from './FloorCalibrationModal'

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
  const [calibratingFloor, setCalibratingFloor] = useState<Floor | null>(null)
  const poisByFloor = usePoiStore((state) => state.poisByFloor)
  const calibrateFloor = useFloorStore((state) => state.calibrateFloor)
  const [form] = Form.useForm<CreateFloorFormValues>()
  const floors = useFloorStore((state) => state.floors)
  const selectedFloorId = useFloorStore((state) => state.selectedFloorId)
  const isFloorLoading = useFloorStore((state) => state.isFloorLoading)
  const selectFloor = useFloorStore((state) => state.selectFloor)
  const addFloor = useFloorStore((state) => state.addFloor)
  const deleteFloor = useFloorStore((state) => state.deleteFloor)
  const updateFloorStatus = useFloorStore((state) => state.updateFloorStatus)
  const { message, modal } = AntApp.useApp()
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

  async function handleCheckFloor(floorId: string, name: string) {
    try {
      const report = await validateFloorGraph(floorId)
      modal[report.valid ? 'success' : 'warning']({
        title: report.valid ? `${name}: đủ điều kiện publish` : `${name}: chưa thể publish`,
        content: report.issues.length === 0 ? 'Không có vấn đề nào.' : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {report.issues.map((issue) => <li key={`${issue.code}-${issue.message}`}><Tag color={issue.severity === 'ERROR' ? 'error' : 'warning'}>{issue.severity === 'ERROR' ? 'Lỗi' : 'Cảnh báo'}</Tag>{hintFor(issue.message)}{issue.ids && ` (${issue.ids.length})`}</li>)}
          </ul>
        ),
      })
    } catch (error) { message.error((error as Error).message) }
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
      if (!isPublished) {
        message.error((error as Error).message)
        return
      }
      modal.error({
        title: 'Chưa thể publish tầng này',
        content: (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {describePublishError((error as Error).message).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ),
      })
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
                  {floor.metersPerPixel == null && <Tag color="warning">Chưa hiệu chuẩn</Tag>}
                  {!floor.mapImageUrl && <Tag color="error">Chưa có ảnh</Tag>}
                </Space>
                <Text type="secondary">Level {floor.level}{poisByFloor[floor.id] ? ` · ${poisByFloor[floor.id].length} POI` : ''}</Text>
              </div>

              <div
                className="floor-list-actions"
                onClick={(event) => event.stopPropagation()}
              >
                <Tooltip title="Hiệu chuẩn tỉ lệ mét/pixel">
                  <Button size="small" icon={<ColumnWidthOutlined />} onClick={() => setCalibratingFloor(floor)} />
                </Tooltip>
                <Tooltip title="Kiểm tra trước khi publish">
                  <Button size="small" icon={<CheckCircleOutlined />} onClick={() => void handleCheckFloor(floor.id, floor.name)} />
                </Tooltip>
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
      <FloorCalibrationModal floor={calibratingFloor} onSubmit={calibrateFloor} onClose={() => setCalibratingFloor(null)} />
    </section>
  )
}
