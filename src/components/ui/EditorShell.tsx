import { Button, Select, Space, Tag, Tooltip, Typography } from 'antd'
import { AimOutlined, DeleteOutlined, EnvironmentOutlined, LinkOutlined, PlusOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons'
import { useEffect, useState, type ReactNode } from 'react'
import type { Building } from '../../types/building'
import type { Floor } from '../../types/floor'

type EditorTool = 'select' | 'node' | 'edge' | 'poi' | 'delete'

type EditorShellProps = {
  buildings: Building[]
  buildingId?: string
  floors: Floor[]
  selectedFloorId?: string
  isBuildingLoading?: boolean
  readOnly?: boolean
  status?: 'saved' | 'saving' | 'dirty'
  secondaryAction?: ReactNode
  primaryAction?: ReactNode
  children: ReactNode
  onBuildingChange: (buildingId: string) => void
  onFloorChange: (floorId: string) => void
}

const toolItems: Array<{ key: EditorTool; label: string; shortcut: string; icon: ReactNode }> = [
  { key: 'select', label: 'Chọn đối tượng', shortcut: 'V', icon: <AimOutlined /> },
  { key: 'node', label: 'Thêm node', shortcut: 'N', icon: <PlusOutlined /> },
  { key: 'edge', label: 'Nối cạnh', shortcut: 'E', icon: <LinkOutlined /> },
  { key: 'poi', label: 'Thêm POI', shortcut: 'P', icon: <EnvironmentOutlined /> },
  { key: 'delete', label: 'Xóa đối tượng', shortcut: 'Delete', icon: <DeleteOutlined /> },
]

export function EditorShell({ buildings, buildingId, floors, selectedFloorId, isBuildingLoading = false, readOnly = false, status = 'saved', secondaryAction, primaryAction, children, onBuildingChange, onFloorChange }: EditorShellProps) {
  const [activeTool, setActiveTool] = useState<EditorTool>('select')
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActiveTool('select')
      const tool = toolItems.find((item) => item.shortcut.toLowerCase() === event.key.toLowerCase())
      if (tool && !readOnly) setActiveTool(tool.key)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readOnly])
  const statusLabel = status === 'saving' ? 'Đang lưu...' : status === 'dirty' ? 'Chưa lưu' : 'Đã lưu'
  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId)

  return <section className="editor-shell">
    <aside className="editor-tool-rail" aria-label="Công cụ bản đồ">
      {toolItems.map((tool) => <Tooltip key={tool.key} title={`${tool.label} (${tool.shortcut})`} placement="right"><Button type={activeTool === tool.key ? 'primary' : 'text'} danger={tool.key === 'delete' && activeTool !== tool.key} className="editor-tool-button" disabled={readOnly} icon={tool.icon} aria-label={tool.label} aria-disabled={readOnly} onClick={() => setActiveTool(tool.key)} /></Tooltip>)}
      <div className="editor-tool-spacer" />
      <Tooltip title="Hoàn tác"><Button type="text" className="editor-tool-button" icon={<ReloadOutlined />} aria-label="Hoàn tác" /></Tooltip>
    </aside>
    <div className="editor-stage-column">
      <div className="editor-context-bar">
        <div className="editor-context-row editor-context-row-top">
          <div className="editor-context-main">
            <Select aria-label="Chọn tòa nhà" value={buildingId} loading={isBuildingLoading} placeholder="Chọn tòa nhà" options={buildings.map((building) => ({ value: building.id, label: building.name }))} onChange={onBuildingChange} />
            <Select aria-label="Chọn tầng" value={selectedFloorId} placeholder="Chọn tầng" disabled={!buildingId || floors.length === 0} options={floors.map((floor) => ({ value: floor.id, label: `${floor.name} · Tầng ${floor.level}` }))} onChange={onFloorChange} />
          </div>
        </div>
        <div className="editor-context-row editor-context-row-bottom">
          <Space className="editor-context-status" wrap>
            <Tag color={selectedFloor?.publishStatus === 'published' ? 'green' : 'gold'}>{selectedFloor?.publishStatus === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</Tag>
            <span className={`editor-save-state ${status}`}>{status === 'saving' ? <SaveOutlined /> : null} {statusLabel}</span>
          </Space>
          <Space className="editor-context-actions" wrap>{secondaryAction}{primaryAction}</Space>
        </div>
      </div>
      {readOnly ? <div className="editor-readonly-note">Tầng này chỉ đọc. Bạn có thể xem dữ liệu nhưng không thể chỉnh sửa.</div> : null}
      <div className="editor-canvas-region">{children}</div>
      <div className="editor-status-bar"><Typography.Text type="secondary">Tọa độ: phần trăm theo sơ đồ</Typography.Text><Typography.Text type="secondary">{readOnly ? 'Chế độ xem' : `Công cụ: ${toolItems.find((tool) => tool.key === activeTool)?.label}`}</Typography.Text></div>
    </div>
  </section>
}
