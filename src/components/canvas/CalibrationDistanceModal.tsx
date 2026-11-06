import { useState } from 'react'
import { Form, InputNumber, Modal } from 'antd'
import type { MapSize, PercentPoint } from '../../types/geometry'
import { distanceInMapUnits, estimateMetersPerPixel } from '../../utils/graphGeometry'

type CalibrationDistanceModalProps = {
  /** Hai điểm đã chấm (%); modal mở khi đủ 2 điểm. */
  points: readonly PercentPoint[]
  mapSize: MapSize
  onSubmit: (realDistanceMeters: number) => Promise<boolean>
  onCancel: () => void
}

/** Hỏi khoảng cách thật giữa hai điểm vừa chấm, kèm tỉ lệ m/px ước tính để người dùng soát lại. */
export function CalibrationDistanceModal({ points, mapSize, onSubmit, onCancel }: CalibrationDistanceModalProps) {
  const [form] = Form.useForm<{ meters: number }>()
  const [submitting, setSubmitting] = useState(false)
  const meters = Form.useWatch('meters', form)
  const ready = points.length === 2
  const pixels = ready ? Math.round(distanceInMapUnits(points[0], points[1], mapSize)) : 0
  const scale = ready && meters ? estimateMetersPerPixel(points[0], points[1], mapSize, meters) : null

  async function handleOk() {
    const { meters: value } = await form.validateFields()
    setSubmitting(true)
    try {
      if (await onSubmit(value)) form.resetFields()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="Khoảng cách thật giữa hai điểm"
      open={ready}
      okText="Lưu tỉ lệ"
      cancelText="Chấm lại"
      confirmLoading={submitting}
      onOk={() => void handleOk()}
      onCancel={onCancel}
      destroyOnHidden
      forceRender
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="meters"
          label={`Hai điểm cách nhau ${pixels} px trên sơ đồ. Ngoài thực tế là bao nhiêu mét?`}
          rules={[{ required: true, message: 'Nhập khoảng cách thật' }]}
          extra={scale ? `≈ ${scale.toPrecision(3)} m/px` : 'Ví dụ: bề rộng cửa chính 2 (m), chiều dài hành lang 30 (m).'}
        >
          <InputNumber min={0.01} max={10000} style={{ width: 200 }} addonAfter="m" autoFocus />
        </Form.Item>
      </Form>
    </Modal>
  )
}
