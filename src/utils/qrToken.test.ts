import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractQrToken } from './qrToken.ts'

const TOKEN = 'MP-0ixO0_jDGT40qteVXiDTimRyIxgCs11rXamItx9s'

describe('extractQrToken', () => {
  it('lấy token từ URL hoặc chính token', () => {
    assert.equal(extractQrToken(`https://app.example/navigate/b1?qr=${TOKEN}`), TOKEN)
    assert.equal(extractQrToken(`  ${TOKEN}\n`), TOKEN)
  })

  it('từ chối nội dung không thuộc SpotWay', () => {
    assert.equal(extractQrToken(''), undefined)
    assert.equal(extractQrToken('https://example.com/menu'), undefined)
    assert.equal(extractQrToken('ngắn'), undefined)
  })
})
