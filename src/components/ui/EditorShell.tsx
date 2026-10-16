import { Button, Select, Space, Tag, Tooltip, Typography } from 'antd'
import { AimOutlined, DeleteOutlined, EnvironmentOutlined, LinkOutlined, LockOutlined, PlusOutlined, SaveOutlined, ZoomInOutlined, ZoomOutOutlined, ReloadOutlined } from '@ant-design/icons'
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

export function EditorShell({ buildings, buildingId, floors, selectedFloorId, isBuildingLoading = false, readOnly = false, status = 'saved', primaryAction, children, onBuildingChange, onFloorChange }: EditorShellProps) {
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
      {toolItems.map((tool) => <Tooltip key={tool.key} title={`${tool.label} (${tool.shortcut})`} placement="right"><Button type={activeTool === tool.key ? 'primary' : 'text'} className="editor-tool-button" disabled={readOnly} icon={tool.icon} aria-label={tool.label} onClick={() => setActiveTool(tool.key)} /></Tooltip>)}
      <div className="editor-tool-spacer" />
      <Tooltip title="Hoàn tác"><Button type="text" className="editor-tool-button" icon={<ReloadOutlined />} aria-label="Hoàn tác" /></Tooltip>
    </aside>
    <div className="editor-stage-column">
      <div className="editor-context-bar">
        <div className="editor-context-main"><Select aria-label="Chọn tòa nhà" value={buildingId} loading={isBuildingLoading} placeholder="Chọn tòa nhà" options={buildings.map((building) => ({ value: building.id, label: building.name }))} onChange={onBuildingChange} /><div className="editor-floor-chips">{floors.map((floor) => <button key={floor.id} type="button" className={`editor-floor-chip${floor.id === selectedFloorId ? ' is-active' : ''}`} onClick={() => onFloorChange(floor.id)}><span className="editor-area-dot" />{floor.name}{floor.id === selectedFloorId && selectedFloor?.publishStatus === 'draft' ? <Tag color="gold">Nháp</Tag> : null}{readOnly ? <LockOutlined /> : null}</button>)}</div></div><Space wrap><Tag color={selectedFloor?.publishStatus === 'published' ? 'green' : 'gold'}>{selectedFloor?.publishStatus === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</Tag><span className={`editor-save-state ${status}`}>{status === 'saving' ? <SaveOutlined /> : null} {statusLabel}</span>{primaryAction}</Space>
      </div>
      {readOnly ? <div className="editor-readonly-note">Tầng này chỉ đọc. Bạn có thể xem dữ liệu nhưng không thể chỉnh sửa.</div> : null}
      <div className="editor-canvas-region">{children}<div className="editor-zoom-controls"><Tooltip title="Thu nhỏ"><Button icon={<ZoomOutOutlined />} aria-label="Thu nhỏ" /></Tooltip><Tooltip title="Phóng to"><Button icon={<ZoomInOutlined />} aria-label="Phóng to" /></Tooltip><Tooltip title="Về mặc định"><Button icon={<AimOutlined />} aria-label="Về mặc định" /></Tooltip></div></div>
      <div className="editor-status-bar"><Typography.Text type="secondary">Con trỏ: --%, --%</Typography.Text><Typography.Text type="secondary">{readOnly ? 'Chế độ xem' : `Công cụ: ${toolItems.find((tool) => tool.key === activeTool)?.label}`}</Typography.Text></div>
    </div>
  </section>
}
