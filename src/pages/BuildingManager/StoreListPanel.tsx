import { useEffect, useState } from 'react'
import {
  App as AntApp,
  Avatar,
  Button,
  Empty,
  Image,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { EyeOutlined, ShopOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { useStoreStore } from '../../store/useStoreStore'
import type { Store, StoreStatus } from '../../types/store'

const { Paragraph, Text } = Typography

function statusColor(status: StoreStatus) {
  return status === 'active' ? 'green' : 'gold'
}

export function StoreListPanel() {
  const [detailStore, setDetailStore] = useState<Store | null>(null)
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const storesByFloorId = useStoreStore((state) => state.storesByFloorId)
  const isLoading = useStoreStore((state) => state.isLoading)
  const loadStoresByFloor = useStoreStore((state) => state.loadStoresByFloor)
  const { message } = AntApp.useApp()
  const stores = selectedFloor ? (storesByFloorId[selectedFloor.id] ?? []) : []

  useEffect(() => {
    if (!selectedFloor) {
      return
    }

    loadStoresByFloor(selectedFloor.id).catch((error: Error) =>
      message.error(error.message),
    )
  }, [loadStoresByFloor, message, selectedFloor])

  if (!selectedFloor) {
    return (
      <div className="store-list-empty">
        <Empty description="Chọn tầng để xem danh sách gian hàng" />
      </div>
    )
  }

  return (
    <div className="store-list-panel">
      <Table<Store>
        rowKey="id"
        loading={isLoading}
        dataSource={stores}
        pagination={false}
        locale={{ emptyText: 'Tầng này chưa có gian hàng' }}
        columns={[
          {
            title: 'Logo',
            dataIndex: 'logoUrl',
            width: 76,
            render: (logoUrl: Store['logoUrl'], store) => (
              <Avatar
                shape="square"
                size={42}
                src={logoUrl ?? undefined}
                icon={logoUrl ? undefined : <ShopOutlined />}
              >
                {store.name.slice(0, 1)}
              </Avatar>
            ),
          },
          {
            title: 'Tên gian hàng',
            dataIndex: 'name',
            render: (name: string) => <Text strong>{name}</Text>,
          },
          { title: 'Nhóm dịch vụ', dataIndex: 'category', width: 140 },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            width: 120,
            render: (status: StoreStatus) => (
              <Tag color={statusColor(status)}>
                {status === 'active' ? 'Đang hoạt động' : 'Tạm ngưng'}
              </Tag>
            ),
          },
          {
            title: 'Hành động',
            key: 'actions',
            width: 130,
            render: (_value: unknown, store) => (
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setDetailStore(store)}
              >
                Xem chi tiết
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={detailStore?.name}
        open={Boolean(detailStore)}
        footer={null}
        onCancel={() => setDetailStore(null)}
      >
        {detailStore ? (
          <Space orientation="vertical" size="middle" className="full-width">
            <Space>
              <Avatar
                shape="square"
                size={56}
                src={detailStore.logoUrl ?? undefined}
                icon={detailStore.logoUrl ? undefined : <ShopOutlined />}
              />
              <Space orientation="vertical" size={2}>
                <Text strong>{detailStore.category}</Text>
                <Tag color={statusColor(detailStore.status)}>
                  {detailStore.status === 'active'
                    ? 'Đang hoạt động'
                    : 'Tạm ngưng'}
                </Tag>
              </Space>
            </Space>
            <Paragraph>{detailStore.description}</Paragraph>
            {detailStore.galleryImageUrls.length > 0 ? (
              <Image.PreviewGroup>
                <div className="store-gallery-grid">
                  {detailStore.galleryImageUrls.map((url) => (
                    <Image key={url} src={url} alt={detailStore.name} />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <Empty description="Chưa có ảnh thực tế" />
            )}
          </Space>
        ) : null}
      </Modal>
    </div>
  )
}
