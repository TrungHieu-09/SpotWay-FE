import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GUEST_TEST_CASES, buildTestReport, guestCaseUrl, summarizeResults } from './guestTestCases.ts'

describe('guestTestCases', () => {
  it('id duy nhất và đủ H1-H10, F1-F6', () => {
    const ids = GUEST_TEST_CASES.map((item) => item.id)
    assert.equal(new Set(ids).size, ids.length)
    for (let i = 1; i <= 10; i += 1) assert.ok(ids.includes(`H${i}`))
    for (let i = 1; i <= 6; i += 1) assert.ok(ids.includes(`F${i}`))
  })

  it('case có scenario mở /guest với ?scenario=, case QR cần token', () => {
    const h1 = GUEST_TEST_CASES.find((item) => item.id === 'H1')!
    assert.equal(guestCaseUrl(h1, 'b1'), '/guest/b1/map?scenario=same-floor-shortest')
    const q1 = GUEST_TEST_CASES.find((item) => item.id === 'Q1')!
    assert.equal(guestCaseUrl(q1, 'b1'), undefined)
    assert.equal(guestCaseUrl(q1, 'b1', 'abc def'), '/guest/b1/map?qr=abc%20def')
  })

  it('tổng hợp kết quả và biên bản', () => {
    const results = { H1: 'pass', H2: 'fail', H3: 'skip' } as const
    const sum = summarizeResults(results)
    assert.deepEqual([sum.pass, sum.fail, sum.skip, sum.pending], [1, 1, 1, sum.all - 3])
    const report = buildTestReport('Toà A', results, { H2: 'lệch | sai\nxuống dòng' }, new Date('2026-11-07T00:00:00Z'))
    assert.match(report, /\| H1 \| Cùng tầng, ngắn nhất \| Đạt \|/)
    assert.match(report, /\| H2 \|.*\| Không đạt \| lệch \/ sai xuống dòng \|/)
  })
})
