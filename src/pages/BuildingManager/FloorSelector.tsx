import { App as AntApp, Button, List, Space, Spin, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'

const { Text } = Typography

type FloorSelectorProps = {
  buildingId?: string
}

export function FloorSelector({ buildingId }: FloorSelectorProps) {
  const floors = useFloorStore((state) => state.floors)
  const selectedFloorId = useFloorStore((state) => state.selectedFloorId)
  const isFloorLoading = useFloorStore((state) => state.isFloorLoading)
  const selectFloor = useFloorStore((state) => state.selectFloor)
  const addFloor = useFloorStore((state) => state.addFloor)
  const { message } = AntApp.useApp()

  return (
    <section className="floor-selector">
      <div className="floor-selector-header">
        <Text strong>Floors</Text>
        <Button
          size="small"
          type="primary"
          icon={<PlusOutlined />}
          disabled={!buildingId}
          onClick={() => {
            if (buildingId) {
              addFloor(buildingId).catch((error: Error) =>
                message.error(error.message),
              )
            }
          }}
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
              <Space direction="vertical" size={2}>
                <Text strong>{floor.name}</Text>
                <Text type="secondary">Level {floor.level}</Text>
              </Space>
              <Tag>{floor.pois.length} POI</Tag>
            </List.Item>
          )}
        />
      </Spin>
    </section>
  )
}
