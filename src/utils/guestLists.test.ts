import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { MAX_RECENT, pushRecent, toggleFavorite } from './guestLists.ts'

describe('guestLists', () => {
  it('pushRecent đưa mục lên đầu, bỏ trùng và giới hạn số lượng', () => {
    assert.deepEqual(pushRecent(['a', 'b', 'c'], 'b'), ['b', 'a', 'c'])
    const many = Array.from({ length: MAX_RECENT }, (_, i) => `x${i}`)
    const next = pushRecent(many, 'new')
    assert.equal(next.length, MAX_RECENT)
    assert.equal(next[0], 'new')
    assert.equal(next.includes(`x${MAX_RECENT - 1}`), false)
  })

  it('toggleFavorite thêm rồi bỏ', () => {
    const added = toggleFavorite(['a'], 'b')
    assert.deepEqual(added, ['b', 'a'])
    assert.deepEqual(toggleFavorite(added, 'b'), ['a'])
  })
})
