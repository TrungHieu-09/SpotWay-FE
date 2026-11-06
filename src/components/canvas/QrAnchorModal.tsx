import { useState } from 'react'
import { Alert, Button, Input, List, message, Modal, Popconfirm, QRCode, Space, Typography } from 'antd'
import { CopyOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import {
  createQrAnchor,
  deleteQrAnchor,
  listQrAnchors,
  qrNavigationUrl,
  type CreatedQrAnchor,
  type QrAnchor,
} from '../../api/qrAnchors'

type QrAnchorModalProps = {
  open: boolean
  buildingId?: string
  node?: { id: string; name: string | null }
  onClose: () => void
}

const { Text } = Typography

/** Tạo mã QR định vị cho một node: khách quét mã thì trang chỉ đường lấy node đó làm điểm xuất phát. */
export function QrAnchorModal({ open, buildingId, node, onClose }: QrAnchorModalProps) {
  const [anchors, setAnchors] = useState<QrAnchor[]>([])
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedQrAnchor>()

  async function reload() {
    if (!node) return
    try {
      setAnchors(await listQrAnchors(node.id))
    } catch (reason) {
      message.error(`Không thể tải danh sách mã QR: ${(reason as Error).message}`)
    }
  }

  async function handleCreate() {
    if (!node || !label.trim()) return
    setCreating(true)
    try {
      setCreated(await createQrAnchor(node.id, label.trim()))
      await reload()
    } catch (reason) {
      message.error(`Không thể tạo mã QR: ${(reason as Error).message}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(anchorId: string) {
    try {
      await deleteQrAnchor(anchorId)
      setCreated((current) => (current?.id === anchorId ? undefined : current))
      await reload()
    } catch (reason) {
      message.error(`Không thể xoá mã QR: ${(reason as Error).message}`)
    }
  }

  const url = created && buildingId ? qrNavigationUrl(window.location.origin, buildingId, created.token) : undefined

  function downloadPng() {
    const canvas = document.querySelector<HTMLCanvasElement>('#qr-anchor-preview canvas')
    if (!canvas || !created) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `qr-${created.label.replace(/\s+/g, '-')}.png`
    link.click()
  }

  return (
    <Modal
      title={`Mã QR định vị${node?.name ? ` — ${node.name}` : ''}`}
      open={open}
      footer={null}
      onCancel={onClose}
      afterOpenChange={(isOpen) => {
        if (isOpen) {
          setCreated(undefined)
          setLabel(node?.name ?? '')
          void reload()
        }
      }}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <Text type="secondary">
          Khách quét mã này sẽ được đặt vị trí xuất phát tại node đang chọn. Dán mã ở đúng chỗ node nằm trên thực tế.
        </Text>
        <Space.Compact style={{ width: '100%' }}>
          <Input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} placeholder="Tên vị trí, ví dụ: Cổng chính tầng 1" />
          <Button type="primary" loading={creating} disabled={!label.trim()} onClick={() => void handleCreate()}>
            Tạo mã
          </Button>
        </Space.Compact>

        {created && url && (
          <div style={{ textAlign: 'center' }}>
            <Alert type="warning" showIcon style={{ marginBottom: 12, textAlign: 'left' }} message="Mã chỉ hiện một lần: hãy tải ảnh hoặc sao chép đường dẫn ngay." />
            <div id="qr-anchor-preview" style={{ display: 'inline-block' }}>
              <QRCode value={url} size={200} />
            </div>
            <Input.TextArea readOnly value={url} autoSize style={{ marginTop: 12, fontSize: 12 }} />
            <Space style={{ marginTop: 8 }}>
              <Button icon={<CopyOutlined />} onClick={() => void navigator.clipboard.writeText(url).then(() => message.success('Đã sao chép'))}>
                Sao chép link
              </Button>
              <Button icon={<DownloadOutlined />} onClick={downloadPng}>
                Tải ảnh QR
              </Button>
              <Button href={url} target="_blank">
                Mở thử
              </Button>
            </Space>
          </div>
        )}

        <List
          size="small"
          header={<Text strong>Mã đã tạo cho node này ({anchors.length})</Text>}
          dataSource={anchors}
          locale={{ emptyText: 'Chưa có mã nào' }}
          renderItem={(anchor) => (
            <List.Item
              actions={[
                <Popconfirm key="delete" title="Xoá mã này?" description="Mã đã in sẽ không dùng được nữa." okText="Xoá" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => void handleDelete(anchor.id)}>
                  <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <Text>{anchor.label}</Text>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{new Date(anchor.createdAt).toLocaleString('vi-VN')}</Text>
            </List.Item>
          )}
        />
      </Space>
    </Modal>
  )
}
