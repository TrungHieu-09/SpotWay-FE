import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { describePublishError } from './publishIssues.ts'

describe('describePublishError', () => {
  it('tách từng lỗi và dịch sang cách sửa', () => {
    const message =
      'The floor cannot be published: Calibrate the floor scale before publishing (PATCH /floors/:id/calibration); ' +
      'The floor has stores or POIs but no EXIT node, EXIT POI or stair/escalator to leave it'
    const lines = describePublishError(message)
    assert.equal(lines.length, 2)
    assert.match(lines[0], /hiệu chuẩn tỉ lệ/)
    assert.match(lines[1], /node EXIT/)
  })

  it('lỗi BE lạ giữ nguyên chữ gốc', () => {
    assert.deepEqual(describePublishError('The floor cannot be published: Something new'), ['Something new'])
  })

  it('thông báo không phải lỗi publish được trả nguyên', () => {
    assert.deepEqual(describePublishError('Network Error'), ['Network Error'])
  })
})
