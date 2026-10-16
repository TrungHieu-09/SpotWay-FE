/* oxlint-disable react/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd'
import type Konva from 'konva'
import {
  Circle,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Text,
} from 'react-konva'
import { useFloorStore } from '../../store/useFloorStore'
import { useNodeStore } from '../../store/useNodeStore'
import type { Node } from '../../types/node'
import { percentToPixel, pixelToPercent } from '../../utils/canvasCoordinates'
import { designTokens } from '../../theme/theme'
import { usePermissions } from '../../auth/usePermissions'

const { Text: AntText, Paragraph } = Typography

type ImageStatus = 'idle' | 'loading' | 'loaded' | 'failed'

function useImage(src?: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [status, setStatus] = useState<ImageStatus>('idle')

  useEffect(() => {
    const normalizedSrc = src?.trim()
    if (!normalizedSrc) {
      setImage(null)
      setStatus('idle')
      return
    }

    const nextImage = new window.Image()
    setImage(null)
    setStatus('loading')
    nextImage.onload = () => {
      setImage(nextImage)
      setStatus('loaded')
    }
    nextImage.onerror = () => {
      setImage(null)
      setStatus('failed')
    }
    nextImage.src = normalizedSrc
  }, [src])

  return { image, status }
}

function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const ref = useCallback((node: T | null) => {
    setElement(node)
  }, [])

  useEffect(() => {
    if (!element) {
      setSize({ width: 0, height: 0 })
      return
    }

    const updateSize = (width: number, height: number) => {
      setSize({
        width: Math.floor(width),
        height: Math.floor(height),
      })
    }

    const rect = element.getBoundingClientRect()
    updateSize(rect.width, rect.height)

    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [element])

  return [ref, size] as const
}

function nodeLabel(node: Node) {
  return node.label?.trim() || node.id.replace('node-', 'Node ')
}

export function NavigationGraphPanel({ readOnly = false }: { readOnly?: boolean }) {
  const [stageHostRef, stageHostSize] = useElementSize<HTMLDivElement>()
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<string>()
  const [edgeKind, setEdgeKind] = useState<'walk' | 'stairs' | 'ramp'>('walk')
  const selectedFloor = useFloorStore((state) => state.selectedFloor)
  const nodesByFloorId = useNodeStore((state) => state.nodesByFloorId)
  const edgesByFloorId = useNodeStore((state) => state.edgesByFloorId)
  const isLoading = useNodeStore((state) => state.isLoading)
  const isSaving = useNodeStore((state) => state.isSaving)
  const error = useNodeStore((state) => state.error)
  const loadGraphByFloors = useNodeStore((state) => state.loadGraphByFloors)
  const generateNavigationGraph = useNodeStore(
    (state) => state.generateNavigationGraph,
  )
  const createNode = useNodeStore((state) => state.createNode)
  const updateNode = useNodeStore((state) => state.updateNode)
  const createEdge = useNodeStore((state) => state.createEdge)
  const deleteNode = useNodeStore((state) => state.deleteNode)
  const deleteEdge = useNodeStore((state) => state.deleteEdge)
  const { message } = AntApp.useApp()
  const permissions = usePermissions()
  const canEdit = !readOnly && permissions.canEditFloor(selectedFloor)
  const mapImage = useImage(selectedFloor?.mapImageUrl ?? null)

  const nodes = selectedFloor ? nodesByFloorId[selectedFloor.id] ?? [] : []
  const edges = selectedFloor ? edgesByFloorId[selectedFloor.id] ?? [] : []
  const selectedNode = nodes.find((node) => node.id === selectedNodeId)
  const orphanNodes = useMemo(
    () => nodes.filter((node) => !edges.some((edge) => edge.fromNodeId === node.id || edge.toNodeId === node.id)),
    [edges, nodes],
  )
  const componentCount = useMemo(() => {
    const adjacency = new Map(nodes.map((node) => [node.id, new Set<string>()]))
    edges.forEach((edge) => {
      adjacency.get(edge.fromNodeId)?.add(edge.toNodeId)
      adjacency.get(edge.toNodeId)?.add(edge.fromNodeId)
    })
    const visited = new Set<string>()
    let count = 0
    nodes.forEach((node) => {
      if (visited.has(node.id)) return
      count += 1
      const queue = [node.id]
      visited.add(node.id)
      while (queue.length > 0) {
        const current = queue.shift()
        if (!current) continue
        adjacency.get(current)?.forEach((next) => {
          if (!visited.has(next)) { visited.add(next); queue.push(next) }
        })
      }
    })
    return count
  }, [edges, nodes])

  useEffect(() => {
    if (!selectedFloor) {
      return
    }

    loadGraphByFloors([selectedFloor.id]).catch((loadError: Error) => {
      message.error(loadError.message)
    })
  }, [loadGraphByFloors, message, selectedFloor])

  useEffect(() => {
    setSelectedNodeId(undefined)
    setEdgeStartNodeId(undefined)
  }, [selectedFloor?.id])

  const stageSize = useMemo(() => {
    if (!selectedFloor) {
      return { width: 0, height: 0 }
    }

    const mapWidth = selectedFloor.mapWidth || 1200
    const mapHeight = selectedFloor.mapHeight || 760
    const scale = Math.min(
      stageHostSize.width / mapWidth,
      stageHostSize.height / mapHeight,
      1,
    )

    return {
      width: Math.round(mapWidth * scale),
      height: Math.round(mapHeight * scale),
    }
  }, [selectedFloor, stageHostSize.height, stageHostSize.width])
  const canRenderStage = stageSize.width > 0 && stageSize.height > 0

  if (!selectedFloor) {
    return (
      <Card className="tool-card canvas-card">
        <div className="canvas-shell canvas-shell-empty">
          <Empty description="Chọn tòa nhà và tầng để tạo graph chỉ đường" />
        </div>
      </Card>
    )
  }

  async function handleStageClick(event: Konva.KonvaEventObject<MouseEvent>) {
    if (!canEdit) return
    const clickedMap =
      event.target === event.target.getStage() ||
      event.target.name() === 'graph-background'

    if (!clickedMap || !selectedFloor) {
      return
    }

    const stage = event.target.getStage()
    const position = stage?.getPointerPosition()
    if (!position) {
      return
    }

    try {
      const node = await createNode(selectedFloor.id, {
        ...pixelToPercent(
          position.x,
          position.y,
          stageSize.width,
          stageSize.height,
        ),
        label: `Điểm ${nodes.length + 1}`,
      })
      setSelectedNodeId(node.id)
      message.success('Đã thêm node chỉ đường')
    } catch (createError) {
      message.error((createError as Error).message)
    }
  }

  async function handleGenerateGraph() {
    if (!selectedFloor || !canEdit) {
      return
    }

    try {
      await generateNavigationGraph(selectedFloor.id)
      setSelectedNodeId(undefined)
      setEdgeStartNodeId(undefined)
      message.success('Đã tự tạo node và edge chỉ đường')
    } catch (generateError) {
      message.error((generateError as Error).message)
    }
  }

  async function handleNodeClick(node: Node) {
    if (!selectedFloor || !canEdit) {
      return
    }

    if (edgeStartNodeId && edgeStartNodeId !== node.id) {
      try {
        await createEdge({
          floorId: selectedFloor.id,
          fromNodeId: edgeStartNodeId,
          toNodeId: node.id,
          kind: edgeKind,
          accessible: edgeKind !== 'stairs',
        })
        setEdgeStartNodeId(undefined)
        setSelectedNodeId(node.id)
        message.success('Đã nối edge')
      } catch (edgeError) {
        message.error((edgeError as Error).message)
      }
      return
    }

    setSelectedNodeId(node.id)
    setEdgeStartNodeId(node.id)
  }

  async function handleNodeDragEnd(
    nodeId: string,
    event: Konva.KonvaEventObject<DragEvent>,
  ) {
    if (!canEdit) return
    try {
      await updateNode(nodeId, {
        ...pixelToPercent(
          event.target.x(),
          event.target.y(),
          stageSize.width,
          stageSize.height,
        ),
      })
    } catch (updateError) {
      message.error((updateError as Error).message)
    }
  }

  async function handleLabelCommit(node: Node, label: string) {
    if (!canEdit) return
    const normalizedLabel = label.trim()
    if (normalizedLabel === node.label) {
      return
    }

    try {
      await updateNode(node.id, { label: normalizedLabel })
      message.success('Đã cập nhật nhãn node')
    } catch (updateError) {
      message.error((updateError as Error).message)
    }
  }

  async function handleElevatorToggle(node: Node, checked: boolean) {
    if (!selectedFloor || !canEdit) {
      return
    }

    try {
      await updateNode(node.id, {
        isElevatorLink: checked,
        elevatorGroupId: checked
          ? node.elevatorGroupId ?? `elevator-${selectedFloor.id}`
          : null,
      })
      message.success('Đã cập nhật node thang máy')
    } catch (updateError) {
      message.error((updateError as Error).message)
    }
  }

  return (
    <div className="canvas-workspace">
      <Card className="tool-card canvas-card">
        <div className="canvas-shell">
          <div className="canvas-toolbar">
            <div>
              <strong>Graph chỉ đường</strong>
              <Tag color="blue">{nodes.length} node</Tag>
              <Tag color="green">{edges.length} edge</Tag>
            </div>
            <Space>
              <span>
                {edgeStartNodeId
                  ? 'Chọn node tiếp theo để nối edge'
                  : 'Click bản đồ để thêm node'}
              </span>
              <Button
                type="primary"
                loading={isSaving}
                onClick={handleGenerateGraph}
                disabled={!canEdit}
              >
                Tự tạo node/edge
              </Button>
              <Select
                value={edgeKind}
                disabled={!canEdit}
                onChange={setEdgeKind}
                options={[
                  { value: 'walk', label: 'Đi bộ' },
                  { value: 'stairs', label: 'Cầu thang' },
                  { value: 'ramp', label: 'Dốc tiếp cận' },
                ]}
              />
            </Space>
          </div>

          {error ? (
            <Alert
              className="canvas-alert"
              message={error}
              type="error"
              showIcon
            />
          ) : null}

          <Alert
            className="canvas-alert"
            type="info"
            showIcon
            message="Bấm Tự tạo node/edge sau khi lưu nhận diện sơ đồ. Node có nhãn sẽ xuất hiện trong dropdown điểm bắt đầu/điểm đến của Guest."
          />
          {orphanNodes.length > 0 ? (
            <Alert
              className="canvas-alert"
              type="warning"
              showIcon
              message={`Có ${orphanNodes.length} node chưa nối edge`}
              description="Hãy nối các node này vào graph trước khi kiểm tra chỉ đường."
            />
          ) : null}
          {componentCount > 1 ? (
            <Alert className="canvas-alert" type="warning" showIcon message={`Graph đang có ${componentCount} cụm rời nhau`} />
          ) : null}

          <Spin spinning={isLoading || isSaving}>
            <div className="stage-host" ref={stageHostRef}>
              {canRenderStage ? (
                <div
                  className="stage-wrap"
                  style={{ width: stageSize.width, height: stageSize.height }}
                >
                  <Stage
                    width={stageSize.width}
                    height={stageSize.height}
                    onClick={handleStageClick}
                  >
                    <Layer>
                      {mapImage.image ? (
                        <KonvaImage
                          name="graph-background"
                          image={mapImage.image}
                          width={stageSize.width}
                          height={stageSize.height}
                        />
                      ) : (
                        <>
                          <Rect
                            name="graph-background"
                            width={stageSize.width}
                            height={stageSize.height}
                            fill={designTokens.surfaceMuted}
                            stroke={designTokens.borderStrong}
                            strokeWidth={2}
                          />
                          <Text
                            x={24}
                            y={24}
                            text={
                              mapImage.status === 'failed'
                                ? 'Không tải được ảnh sơ đồ'
                                : 'Chưa có ảnh sơ đồ'
                            }
                            fontSize={18}
                            fill={designTokens.ink700}
                            listening={false}
                          />
                        </>
                      )}

                      {edges.map((edge) => {
                        const fromNode = nodes.find(
                          (node) => node.id === edge.fromNodeId,
                        )
                        const toNode = nodes.find(
                          (node) => node.id === edge.toNodeId,
                        )
                        if (!fromNode || !toNode) {
                          return null
                        }

                        const fromPixel = percentToPixel(
                          fromNode.x,
                          fromNode.y,
                          stageSize.width,
                          stageSize.height,
                        )
                        const toPixel = percentToPixel(
                          toNode.x,
                          toNode.y,
                          stageSize.width,
                          stageSize.height,
                        )

                        return (
                          <Line
                            key={edge.id}
                            points={[
                              fromPixel.pixelX,
                              fromPixel.pixelY,
                              toPixel.pixelX,
                              toPixel.pixelY,
                            ]}
                            stroke={edge.kind === 'stairs' ? designTokens.warning : edge.kind === 'ramp' ? designTokens.blue700 : designTokens.success}
                            strokeWidth={5}
                            opacity={0.82}
                            lineCap="round"
                            listening={false}
                          />
                        )
                      })}

                      {nodes.map((node) => {
                        const { pixelX, pixelY } = percentToPixel(
                          node.x,
                          node.y,
                          stageSize.width,
                          stageSize.height,
                        )
                        const isSelected = node.id === selectedNodeId
                        const isEdgeStart = node.id === edgeStartNodeId

                        return (
                          <Circle
                            key={node.id}
                            x={pixelX}
                            y={pixelY}
                            radius={isSelected ? 13 : 10}
                            fill={node.isElevatorLink ? designTokens.blue700 : designTokens.blue600}
                            stroke={isEdgeStart ? designTokens.warning : designTokens.surface}
                            strokeWidth={isEdgeStart ? 5 : 3}
                            draggable={canEdit}
                            onClick={(event) => {
                              event.cancelBubble = true
                              handleNodeClick(node)
                            }}
                            onDragEnd={(event) =>
                              handleNodeDragEnd(node.id, event)
                            }
                          />
                        )
                      })}
                    </Layer>
                  </Stage>
                </div>
              ) : (
                <div className="stage-empty">
                  <Empty description="Đang đo kích thước canvas" />
                </div>
              )}
            </div>
          </Spin>
        </div>
      </Card>

      <Card title="Node" className="tool-card poi-card">
        {selectedNode ? (
          <Space orientation="vertical" size="middle" className="full-width">
            <div>
              <AntText strong>Nhãn điểm đến</AntText>
              <Input
                key={selectedNode.id}
                defaultValue={selectedNode.label}
                placeholder="Ví dụ: Cửa hàng A"
                onPressEnter={(event) =>
                  handleLabelCommit(selectedNode, event.currentTarget.value)
                }
                onBlur={(event) =>
                  handleLabelCommit(selectedNode, event.currentTarget.value)
                }
                disabled={!canEdit}
              />
            </div>
            <div className="graph-node-toggle">
              <AntText>Node thang máy</AntText>
              <Switch
                checked={Boolean(selectedNode.isElevatorLink)}
                onChange={(checked) =>
                  handleElevatorToggle(selectedNode, checked)
                }
                disabled={!canEdit}
              />
            </div>
            <Button
              danger
              disabled={!canEdit || isSaving}
              onClick={() => {
                void deleteNode(selectedNode.id)
                  .then(() => {
                    setSelectedNodeId(undefined)
                    setEdgeStartNodeId(undefined)
                    message.success('Đã xoá node')
                  })
                  .catch((deleteError: Error) => message.error(deleteError.message))
              }}
            >
              Xoá node
            </Button>
            <Paragraph type="secondary">
              Tọa độ {selectedNode.x.toFixed(1)}%, {selectedNode.y.toFixed(1)}%.
              Chọn node khác sau node này để nối edge.
            </Paragraph>
          </Space>
        ) : nodes.length > 0 ? (
          <Space orientation="vertical" size={10} className="full-width">
            {nodes.map((node) => (
              <Button
                key={node.id}
                className="full-width graph-node-button"
                onClick={() => {
                  setSelectedNodeId(node.id)
                  setEdgeStartNodeId(node.id)
                }}
              >
                {nodeLabel(node)}
              </Button>
            ))}
            {edges.length > 0 ? (
              <div>
                <AntText strong>Edge</AntText>
                {edges.map((edge) => (
                  <Space key={edge.id} className="full-width" style={{ justifyContent: 'space-between' }}>
                    <AntText>{edge.kind === 'stairs' ? 'Cầu thang' : edge.kind === 'ramp' ? 'Dốc' : 'Đi bộ'}</AntText>
                    <Button danger size="small" disabled={!canEdit} onClick={() => void deleteEdge(edge.id).catch((deleteError: Error) => message.error(deleteError.message))}>Xoá</Button>
                  </Space>
                ))}
              </div>
            ) : null}
          </Space>
        ) : (
          <Empty description="Click lên bản đồ để thêm node" />
        )}
      </Card>
    </div>
  )
}


