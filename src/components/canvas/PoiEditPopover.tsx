import { useState } from 'react'
import { Button, Input, Popconfirm, Popover, Select, Space } from 'antd'
import type { MapSize } from '../../types/geometry'
import type { Poi, PoiCategory, PoiDetailsPatch } from '../../types/poi'
import { percentToPixel } from '../../utils/canvasCoordinates'

const POI_CATEGORY_OPTIONS: Array<{ value: PoiCategory; label: string }> = [
  { value: 'restroom', label: 'Nhà vệ sinh' },
  { value: 'elevator', label: 'Thang máy' },
  { value: 'exit', label: 'Lối thoát' },
  { value: 'info', label: 'Quầy thông tin' },
  { value: 'parking', label: 'Bãi đỗ xe' },
  { value: 'custom', label: 'Khác' },
]

const POI_ICON_OPTIONS = ['wc', 'elevator', 'exit', 'info', 'parking', 'atm', 'cafe', 'shop'].map((value) => ({ value }))

type PoiEditPopoverProps = {
  poi: Poi
  size: MapSize
  onSave: (patch: PoiDetailsPatch) => void
  onDelete: () => void
  onClose: () => void
}

/** Chỉ gửi các trường thật sự đổi để không tạo request thừa. */
function diffPatch(poi: Poi, draft: { name: string; category: PoiCategory; icon: string | null }): PoiDetailsPatch {
  const patch: PoiDetailsPatch = {}
  const name = draft.name.trim()
  if (name && name !== poi.name) patch.name = name
  if (draft.category !== poi.category) patch.category = draft.category
  if (draft.icon && draft.icon !== poi.icon) patch.icon = draft.icon
  return patch
}

function PoiEditForm({ poi, onSave, onDelete, onClose }: Omit<PoiEditPopoverProps, 'size'>) {
  const [name, setName] = useState(poi.name)
  const [category, setCategory] = useState<PoiCategory>(poi.category)
  const [icon, setIcon] = useState<string | null>(poi.icon)
  const patch = diffPatch(poi, { name, category, icon })
  const canSave = Object.keys(patch).length > 0

  return (
    <Space orientation="vertical" size={8} style={{ width: 240 }}>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={100}
        placeholder="Tên POI"
        status={name.trim() ? undefined : 'error'}
      />
      <Select value={category} onChange={setCategory} options={POI_CATEGORY_OPTIONS} style={{ width: '100%' }} />
      <Select
        value={icon}
        onChange={(value) => setIcon(value ?? null)}
        options={POI_ICON_OPTIONS}
        placeholder="Icon (mặc định theo loại)"
        allowClear
        showSearch
        style={{ width: '100%' }}
      />
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <Popconfirm title="Xoá POI này?" okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true }} onConfirm={onDelete}>
          <Button danger size="small">
            Xoá
          </Button>
        </Popconfirm>
        <Space>
          <Button size="small" onClick={onClose}>
            Đóng
          </Button>
          <Button
            size="small"
            type="primary"
            disabled={!canSave}
            onClick={() => {
              onSave(patch)
              onClose()
            }}
          >
            Lưu
          </Button>
        </Space>
      </Space>
    </Space>
  )
}

/** Popover neo vào vị trí POI trên canvas; cha phải có `position: relative` và kích thước = `size`. */
export function PoiEditPopover({ poi, size, ...handlers }: PoiEditPopoverProps) {
  const { pixelX, pixelY } = percentToPixel(poi.x, poi.y, size.width, size.height)
  return (
    <Popover open placement="right" title="Cập nhật POI" trigger={[]} content={<PoiEditForm key={poi.id} poi={poi} {...handlers} />}>
      <div style={{ position: 'absolute', left: pixelX, top: pixelY, width: 1, height: 1, pointerEvents: 'none' }} />
    </Popover>
  )
}
