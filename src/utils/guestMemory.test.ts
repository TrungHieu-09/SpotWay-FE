import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DESTINATION_TTL_MS, forgetDestination, recallDestination, rememberDestination, type KeyValueStorage } from './guestMemory.ts'

function fakeStorage(): KeyValueStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

describe('guestMemory', () => {
  it('nhớ điểm đến theo tòa nhà và hết hạn sau 30 phút', () => {
    const storage = fakeStorage()
    rememberDestination(storage, 'b1', 'poi-7', 0)
    assert.equal(recallDestination(storage, 'b1', DESTINATION_TTL_MS), 'poi-7')
    assert.equal(recallDestination(storage, 'b2', 1), undefined)
    assert.equal(recallDestination(storage, 'b1', DESTINATION_TTL_MS + 1), undefined)
  })

  it('quên an toàn khi dữ liệu trống hoặc hỏng', () => {
    const storage = fakeStorage()
    assert.equal(recallDestination(storage, 'b1'), undefined)
    storage.setItem('spotway.guest.destination', '{bad')
    assert.equal(recallDestination(storage, 'b1'), undefined)
    rememberDestination(storage, 'b1', 'poi-7')
    forgetDestination(storage)
    assert.equal(recallDestination(storage, 'b1'), undefined)
  })
})
