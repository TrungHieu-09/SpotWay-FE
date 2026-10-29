import { useState } from 'react'
import { Alert, App as AntApp, Form, InputNumber, Modal, Radio, Typography } from 'antd'
import type { CalibrateFloorInput } from '../../api/floors'
import type { Floor } from '../../types/floor'

type CalibrationMode = 'width' | 'direct'

type FloorCalibrationModalProps = {
  floor: Floor | null
  onSubmit: (floorId: string, input: CalibrateFloorInput) => Promise<number>
  onClose: () => void
}

type FormValues = { realWidthMeters?: number; metersPerPixel?: number }

/** Đặt tỉ lệ mét/pixel cho tầng: theo bề rộng thật của sơ đồ, hoặc nhập thẳng mét/pixel. */
export function FloorCalibrationModal({ floor, onSubmit, onClose }: FloorCalibrationModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [mode, setMode] = useState<CalibrationMode>('width')
  const [submitting, setSubmitting] = useState(false)
  const { message } = AntApp.useApp()
  const realWidthMeters = Form.useWatch('realWidthMeters', form)

  async function handleOk() {
    if (!floor) return
    const values = await form.validateFields()
    // Bề rộng thật = khoảng cách giữa mép trái và mép phải ảnh (pixel bản đồ), để BE tự tính mét/pixel.
    const input: CalibrateFloorInput =
      mode === 'width'
        ? { pointA: { x: 0, y: 0 }, pointB: { x: floor.mapWidth, y: 0 }, realDistanceMeters: values.realWidthMeters! }
        : { metersPerPixel: values.metersPerPixel! }
    setSubmitting(true)
    try {
      const edges = await onSubmit(floor.id, input)
      message.success(`Đã hiệu chuẩn tầng, tính lại độ dài ${edges} edge.`)
      form.resetFields()
      onClose()
    } catch (reason) {
      message.error((reason as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={floor ? `Hiệu chuẩn tỉ lệ — ${floor.name}` : 'Hiệu chuẩn tỉ lệ'}
      open={floor !== null}
      okText="Lưu tỉ lệ"
      cancelText="Hủy"
      confirmLoading={submitting}
      onOk={() => void handleOk()}
      onCancel={onClose}
      destroyOnHidden
      forceRender
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 12 }}
        message="BE cần tỉ lệ mét/pixel để tính độ dài edge và cho phép publish tầng. Đổi tỉ lệ sẽ tính lại độ dài mọi edge."
      />
      {floor && (
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Ảnh sơ đồ: {floor.mapWidth} × {floor.mapHeight} px.
          {floor.metersPerPixel != null && ` Tỉ lệ hiện tại: ${floor.metersPerPixel} m/px.`}
        </Typography.Paragraph>
      )}
      <Radio.Group
        value={mode}
        onChange={(event) => setMode(event.target.value as CalibrationMode)}
        optionType="button"
        buttonStyle="solid"
        style={{ marginBottom: 12 }}
        options={[
          { value: 'width', label: 'Theo bề rộng thật của sơ đồ' },
          { value: 'direct', label: 'Nhập mét/pixel' },
        ]}
      />
      <Form<FormValues> form={form} layout="vertical">
        {mode === 'width' ? (
          <Form.Item
            name="realWidthMeters"
            label="Bề rộng thật của toàn bộ ảnh sơ đồ (mét)"
            rules={[{ required: true, message: 'Nhập bề rộng thật' }]}
            extra={
              floor && realWidthMeters
                ? `≈ ${(realWidthMeters / floor.mapWidth).toPrecision(3)} m/px`
                : 'Đo từ mép trái đến mép phải ảnh, ví dụ 60 (m).'
            }
          >
            <InputNumber min={0.01} max={10000} style={{ width: 200 }} addonAfter="m" />
          </Form.Item>
        ) : (
          <Form.Item
            name="metersPerPixel"
            label="Mét trên mỗi pixel"
            rules={[{ required: true, message: 'Nhập tỉ lệ' }]}
            extra="Ví dụ 0.05 nghĩa là 1 pixel = 5 cm."
          >
            <InputNumber min={0.000001} max={100} step={0.01} style={{ width: 200 }} addonAfter="m/px" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}
