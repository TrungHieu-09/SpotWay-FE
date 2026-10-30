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
  it('nhớ và gọi lại điểm đến của đúng toà nhà', () => {
    const storage = fakeStorage()
    rememberDestination(storage, 'b1', 'poi-7', 1000)
    assert.equal(recallDestination(storage, 'b1', 2000), 'poi-7')
    assert.equal(recallDestination(storage, 'b2', 2000), undefined)
  })

  it('quá 30 phút thì quên', () => {
    const storage = fakeStorage()
    rememberDestination(storage, 'b1', 'poi-7', 0)
    assert.equal(recallDestination(storage, 'b1', DESTINATION_TTL_MS), 'poi-7')
    assert.equal(recallDestination(storage, 'b1', DESTINATION_TTL_MS + 1), undefined)
  })

  it('forget xoá hẳn; chưa lưu gì thì trả undefined', () => {
    const storage = fakeStorage()
    assert.equal(recallDestination(storage, 'b1'), undefined)
    rememberDestination(storage, 'b1', 'poi-7')
    forgetDestination(storage)
    assert.equal(recallDestination(storage, 'b1'), undefined)
  })

  it('dữ liệu hỏng hoặc sai dạng không làm lỗi', () => {
    const storage = fakeStorage()
    storage.setItem('spotway.guest.destination', '{không phải json')
    assert.equal(recallDestination(storage, 'b1'), undefined)
    storage.setItem('spotway.guest.destination', JSON.stringify({ buildingId: 'b1', destinationId: 5 }))
    assert.equal(recallDestination(storage, 'b1'), undefined)
  })
})
