import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { en } from './en.ts'
import { vi } from './vi.ts'

describe('i18n dictionaries', () => {
  it('tiếng Việt và tiếng Anh có cùng bộ khoá, không để trống', () => {
    assert.deepEqual(Object.keys(en).sort(), Object.keys(vi).sort())
    for (const [key, value] of Object.entries(vi)) assert.ok(value.length > 0, `vi ${key} trống`)
    for (const [key, value] of Object.entries(en)) assert.ok(value.length > 0, `en ${key} trống`)
  })
})
