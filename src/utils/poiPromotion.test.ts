import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { NodeType } from '../types/graph.ts'
import type { PoiCategory } from '../types/poi.ts'
import { planPoiPromotions } from './poiPromotion.ts'

const poi = (id: string, category: PoiCategory, nearestNodeId: string | null, x = 10, y = 20) => ({ id, name: `POI ${id}`, category, nearestNodeId, x, y })
const node = (id: string, type: NodeType = 'NORMAL') => ({ id, type })

describe('planPoiPromotions', () => {
  it('POI thang máy và lối ra gắn vào node thường: lên kế hoạch tạo node đúng loại tại vị trí POI', () => {
    const plans = planPoiPromotions([poi('a', 'elevator', 'n1', 5, 6), poi('b', 'exit', 'n2')], [node('n1'), node('n2')])
    assert.deepEqual(plans, [
      { poiId: 'a', name: 'POI a', nodeType: 'ELEVATOR', at: { x: 5, y: 6 }, anchorNodeId: 'n1' },
      { poiId: 'b', name: 'POI b', nodeType: 'EXIT', at: { x: 10, y: 20 }, anchorNodeId: 'n2' },
    ])
  })

  it('bỏ qua POI loại khác (nhà vệ sinh, thông tin, đỗ xe, tuỳ chọn)', () => {
    const pois = (['restroom', 'info', 'parking', 'custom'] as const).map((category, i) => poi(`p${i}`, category, 'n1'))
    assert.deepEqual(planPoiPromotions(pois, [node('n1')]), [])
  })

  it('đã gắn vào node đúng loại thì không tạo lại (chạy lần hai không sinh node trùng)', () => {
    assert.deepEqual(planPoiPromotions([poi('a', 'elevator', 'lift')], [node('lift', 'ELEVATOR')]), [])
    assert.deepEqual(planPoiPromotions([poi('b', 'exit', 'door')], [node('door', 'EXIT')]), [])
  })

  it('node neo là loại khác (vd. POI exit gắn vào node thang) vẫn được nâng', () => {
    const plans = planPoiPromotions([poi('b', 'exit', 'lift')], [node('lift', 'ELEVATOR')])
    assert.equal(plans[0].nodeType, 'EXIT')
    assert.equal(plans[0].anchorNodeId, 'lift')
  })

  it('POI chưa có node neo hoặc node neo không còn: anchorNodeId = null', () => {
    const plans = planPoiPromotions([poi('a', 'elevator', null), poi('b', 'exit', 'ghost')], [node('n1')])
    assert.deepEqual(plans.map((p) => p.anchorNodeId), [null, null])
  })
})
