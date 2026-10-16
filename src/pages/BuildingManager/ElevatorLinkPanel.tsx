import { useEffect, useMemo, useState } from 'react'
import {
  App as AntApp,
  Button,
  Card,
  Empty,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useFloorStore } from '../../store/useFloorStore'
import { useNodeStore } from '../../store/useNodeStore'
import type { Floor } from '../../types/floor'
import type { Node } from '../../types/node'
import { usePermissions } from '../../auth/usePermissions'

const { Text, Title } = Typography
const UNASSIGNED_GROUP_VALUE = '__unassigned__'

type ElevatorNodeRow = {
  node: Node
  floor: Floor
}

function groupLabel(groupId: string, index: number) {
  const suffix = String.fromCharCode(65 + (index % 26))
  return groupId.startsWith('elevator-group-')
    ? `Nhóm thang máy ${suffix}`
    : groupId
}

export function ElevatorLinkPanel({ readOnly = false }: { readOnly?: boolean }) {
  const [createdGroupIds, setCreatedGroupIds] = useState<string[]>([])
  const floors = useFloorStore((state) => state.floors)
  const nodesByFloorId = useNodeStore((state) => state.nodesByFloorId)
  const isLoading = useNodeStore((state) => state.isLoading)
  const isSaving = useNodeStore((state) => state.isSaving)
  const loadNodesByFloors = useNodeStore((state) => state.loadNodesByFloors)
  const updateNodeElevatorGroup = useNodeStore(
    (state) => state.updateNodeElevatorGroup,
  )
  const { message } = AntApp.useApp()
  const permissions = usePermissions()
  const canEdit = !readOnly && permissions.user?.role !== 'store_owner'
  const floorIdsKey = floors.map((floor) => floor.id).join('|')

  useEffect(() => {
    if (floors.length === 0) {
      return
    }

    loadNodesByFloors(floors.map((floor) => floor.id)).catch((error: Error) =>
      message.error(error.message),
    )
  }, [floorIdsKey, floors, loadNodesByFloors, message])

  const elevatorNodeRows = useMemo<ElevatorNodeRow[]>(() => {
    return floors.flatMap((floor) =>
      (nodesByFloorId[floor.id] ?? [])
        .filter((node) => node.isElevatorLink)
        .map((node) => ({ floor, node })),
    )
  }, [floors, nodesByFloorId])

  const groupIds = useMemo(() => {
    const existingGroupIds = elevatorNodeRows
      .map(({ node }) => node.elevatorGroupId)
      .filter((groupId): groupId is string => Boolean(groupId))

    return Array.from(new Set([...existingGroupIds, ...createdGroupIds])).sort()
  }, [createdGroupIds, elevatorNodeRows])

  const groupLabelById = useMemo(() => {
    return Object.fromEntries(
      groupIds.map((groupId, index) => [groupId, groupLabel(groupId, index)]),
    )
  }, [groupIds])

  const groupedRows = useMemo(() => {
    return groupIds.map((groupId) => ({
      groupId,
      rows: elevatorNodeRows.filter(
        ({ node }) => node.elevatorGroupId === groupId,
      ),
    }))
  }, [elevatorNodeRows, groupIds])

  function handleCreateGroup() {
    const nextGroupId = `elevator-group-${crypto.randomUUID()}`
    setCreatedGroupIds((currentGroupIds) => [
      ...currentGroupIds,
      nextGroupId,
    ])
    message.success('Đã tạo nhóm thang máy mới')
  }

  async function handleAssignGroup(nodeId: string, value: string) {
    try {
      await updateNodeElevatorGroup(
        nodeId,
        value === UNASSIGNED_GROUP_VALUE ? null : value,
      )
      message.success('Đã cập nhật nhóm thang máy')
    } catch (error) {
      message.error((error as Error).message)
    }
  }

  if (floors.length === 0) {
    return (
      <div className="store-list-empty">
        <Empty description="Chọn tòa nhà để xem node thang máy" />
      </div>
    )
  }

  return (
    <div className="elevator-link-panel">
      <Card className="tool-card">
        <div className="elevator-link-header">
          <div>
            <Title level={3}>Liên kết node thang máy</Title>
            <Text type="secondary">
              Gán các node thang máy ở nhiều tầng vào cùng một nhóm liên kết.
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateGroup}
            disabled={!canEdit}
          >
            Tạo nhóm thang máy mới
          </Button>
        </div>

        <Spin spinning={isLoading || isSaving}>
          <Table<ElevatorNodeRow>
            rowKey={({ node }) => node.id}
            dataSource={elevatorNodeRows}
            pagination={false}
            locale={{ emptyText: 'Chưa có node thang máy trong building này' }}
            columns={[
              {
                title: 'Tầng',
                render: (_value: unknown, row) => (
                  <Space orientation="vertical" size={2}>
                    <Text strong>{row.floor.name}</Text>
                    <Text type="secondary">Tầng {row.floor.level}</Text>
                  </Space>
                ),
              },
              {
                title: 'Node',
                render: (_value: unknown, row) => (
                  <Space orientation="vertical" size={2}>
                    <Text>{row.node.id}</Text>
                    <Text type="secondary">
                      {row.node.x.toFixed(1)}%, {row.node.y.toFixed(1)}%
                    </Text>
                  </Space>
                ),
              },
              {
                title: 'Nhóm thang máy',
                width: 280,
                render: (_value: unknown, row) => (
                  <Select
                    className="full-width"
                    value={row.node.elevatorGroupId ?? UNASSIGNED_GROUP_VALUE}
                    onChange={(value) => handleAssignGroup(row.node.id, value)}
                    disabled={!canEdit || isSaving}
                    options={[
                      {
                        label: 'Chưa liên kết',
                        value: UNASSIGNED_GROUP_VALUE,
                      },
                      ...groupIds.map((groupId) => ({
                        label: groupLabelById[groupId],
                        value: groupId,
                      })),
                    ]}
                  />
                ),
              },
            ]}
          />
        </Spin>
      </Card>

      <Card title="Nhóm thang máy" className="tool-card">
        {groupedRows.some(({ rows }) => rows.length > 0) ? (
          <Space orientation="vertical" size="middle" className="full-width">
            {groupedRows
              .filter(({ rows }) => rows.length > 0)
              .map(({ groupId, rows }) => (
                <div className="elevator-group-summary" key={groupId}>
                  <Tag color="blue">{groupLabelById[groupId]}</Tag>
                  <Text>
                    {rows
                      .map(
                        ({ floor, node }) =>
                          `${floor.name} (${node.id.replace('node-', 'Node #')})`,
                      )
                      .join(', ')}
                  </Text>
                </div>
              ))}
          </Space>
        ) : (
          <Empty description="Chưa có nhóm thang máy nào" />
        )}
      </Card>
    </div>
  )
}
