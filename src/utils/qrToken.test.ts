import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { extractQrToken } from './qrToken.ts'

const TOKEN = 'MP-0ixO0_jDGT40qteVXiDTimRyIxgCs11rXamItx9s'

describe('extractQrToken', () => {
  it('lấy token từ đường link có tham số qr', () => {
    assert.equal(extractQrToken(`http://localhost:5173/navigate/b1?qr=${TOKEN}`), TOKEN)
    assert.equal(extractQrToken(`https://app.example.com/navigate/b1?toStoreId=s&qr=${TOKEN}`), TOKEN)
  })

  it('chấp nhận chính token, bỏ khoảng trắng hai đầu', () => {
    assert.equal(extractQrToken(`  ${TOKEN}\n`), TOKEN)
  })

  it('từ chối nội dung không phải của hệ thống', () => {
    assert.equal(extractQrToken(''), undefined)
    assert.equal(extractQrToken('https://example.com/menu'), undefined)
    assert.equal(extractQrToken('xin chào'), undefined)
    assert.equal(extractQrToken('ngắn'), undefined)
  })
})
