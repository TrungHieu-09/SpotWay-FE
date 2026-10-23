import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildCorridorDraft } from './navigationDraft.ts'

describe('buildCorridorDraft', () => {
  const draft = buildCorridorDraft(1200, 800, ['AI trả về 0 node'])

  it('sinh node trong biên bản đồ theo đơn vị bản đồ', () => {
    assert.ok(draft.nodes.length >= 5)
    for (const node of draft.nodes) {
      assert.ok(node.x > 0 && node.x < 1200 && node.y > 0 && node.y < 800)
      assert.equal(node.requiresConfirmation, true)
    }
    const center = draft.nodes.find((node) => node.id === 'seed-c')
    assert.deepEqual([center?.x, center?.y, center?.type], [600, 400, 'JUNCTION'])
  })
  it('đồ thị liên thông và không có cạnh tới node không tồn tại', () => {
    const ids = new Set(draft.nodes.map((node) => node.id))
    assert.equal(ids.size, draft.nodes.length)
    assert.ok(draft.edges.every((edge) => ids.has(edge.fromNodeId) && ids.has(edge.toNodeId)))
    const reached = new Set(['seed-c'])
    for (let round = 0; round < ids.size; round += 1) {
      for (const edge of draft.edges) {
        if (reached.has(edge.fromNodeId)) reached.add(edge.toNodeId)
        if (reached.has(edge.toNodeId)) reached.add(edge.fromNodeId)
      }
    }
    assert.equal(reached.size, ids.size)
  })
  it('giữ cảnh báo cũ và ghi chú đây là bản nháp mẫu', () => {
    assert.equal(draft.warnings[0], 'AI trả về 0 node')
    assert.ok(draft.warnings.length >= 2)
  })
})
