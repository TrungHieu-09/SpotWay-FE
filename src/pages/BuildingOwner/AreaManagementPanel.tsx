import { useEffect, useState } from 'react'
import { App as AntApp, Button, Form, Input, Modal, Popconfirm } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { createArea, deleteArea, getBuildingAreas, updateArea } from '../../api/areas'
import type { Area } from '../../types/area'
import { GlassCard } from '../../components/ui'
import './AreaManagementPanel.css'

type AreaFormValues = Pick<Area, 'name' | 'description' | 'color'>

export function AreaManagementPanel({ buildingId }: { buildingId: string }) {
  const [areas, setAreas] = useState<Area[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Area | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<AreaFormValues>()
  const { message } = AntApp.useApp()

  async function reload() {
    setLoading(true)
    try {
      setAreas(await getBuildingAreas(buildingId))
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
  }, [buildingId])

  function openForm(area?: Area) {
    setEditing(area ?? null)
    form.setFieldsValue(
      area
        ? { name: area.name, description: area.description, color: area.color }
        : { color: '#8B5CF6' },
    )
    setOpen(true)
  }

  async function submit(values: AreaFormValues) {
    setSaving(true)
    try {
      if (editing) {
        await updateArea(editing.id, values)
        message.success('Đã cập nhật khu vực')
      } else {
        await createArea(buildingId, values)
        message.success('Đã tạo khu vực')
      }
      setOpen(false)
      form.resetFields()
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(areaId: string) {
    try {
      await deleteArea(areaId)
      message.success('Đã xóa khu vực')
      await reload()
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  return (
    <>
      <GlassCard
        title={`Khu vực quản lý (${areas.length})`}
        extra={
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => openForm()}
          >
            Thêm khu vực
          </Button>
        }
      >
        {loading ? (
          <div className="amp-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="amp-skeleton" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <div className="amp-empty">
            <AppstoreOutlined className="amp-empty__icon" />
            <p>Chưa có khu vực nào</p>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openForm()}
            >
              Thêm khu vực đầu tiên
            </Button>
          </div>
        ) : (
          <div className="amp-grid">
            {areas.map((area, idx) => (
              <div
                key={area.id}
                className="amp-area-card"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div
                  className="amp-area-card__swatch"
                  style={{ background: area.color }}
                />
                <div className="amp-area-card__body">
                  <div className="amp-area-card__name">{area.name}</div>
                  {area.description && (
                    <div className="amp-area-card__desc">{area.description}</div>
                  )}
                  <div className="amp-area-card__date">
                    Tạo ngày{' '}
                    {new Intl.DateTimeFormat('vi-VN').format(new Date(area.createdAt))}
                  </div>
                </div>
                <div className="amp-area-card__actions">
                  <button
                    className="amp-btn amp-btn--default"
                    title="Sửa khu vực"
                    onClick={() => openForm(area)}
                  >
                    <EditOutlined />
                  </button>
                  <Popconfirm
                    title="Xóa khu vực này?"
                    description="Tầng đang gán khu vực này sẽ cần được phân công lại."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => remove(area.id)}
                  >
                    <button className="amp-btn amp-btn--danger" title="Xóa">
                      <DeleteOutlined />
                    </button>
                  </Popconfirm>
                </div>
              </div>
            ))}

            {/* Add more */}
            <button className="amp-add-card" onClick={() => openForm()}>
              <PlusOutlined className="amp-add-card__icon" />
              <span>Thêm khu vực</span>
            </button>
          </div>
        )}
      </GlassCard>

      {/* ── Form modal ── */}
      <Modal
        title={
          <span className="amp-modal__title">
            <AppstoreOutlined /> {editing ? 'Sửa khu vực' : 'Thêm khu vực'}
          </span>
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
        confirmLoading={saving}
        width={440}
      >
        <Form form={form} layout="vertical" onFinish={submit}>
          <Form.Item
            name="name"
            label="Tên khu vực"
            rules={[{ required: true, message: 'Nhập tên khu vực' }]}
          >
            <Input placeholder="VD: Khu A, Tầng thương mại..." />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về khu vực..." />
          </Form.Item>

          <Form.Item name="color" label="Màu hiển thị">
            <div className="amp-color-picker-row">
              <Form.Item name="color" noStyle>
                <input type="color" className="amp-color-input" />
              </Form.Item>
              <span className="amp-color-hint">Chọn màu đại diện cho khu vực trên bản đồ</span>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
