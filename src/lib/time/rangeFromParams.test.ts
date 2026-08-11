import { describe, expect, it } from 'vitest'
import { parseRangeParams } from './rangeFromParams'

describe('parseRangeParams (item 1.29)', () => {
  const TODAY = '2026-08-10'

  it('missing params fall back to current month to date', () => {
    expect(parseRangeParams({}, TODAY)).toEqual({ from: '2026-08-01', to: '2026-08-10' })
  })

  it('malformed params (not a business date) fall back rather than error', () => {
    expect(parseRangeParams({ from: 'not-a-date', to: 'also-not-a-date' }, TODAY)).toEqual({
      from: '2026-08-01',
      to: '2026-08-10',
    })
  })

  it('an inverted range (from > to) falls back rather than error', () => {
    expect(parseRangeParams({ from: '2026-06-30', to: '2026-06-01' }, TODAY)).toEqual({
      from: '2026-08-01',
      to: '2026-08-10',
    })
  })

  it('a well-formed range is used as-is', () => {
    expect(parseRangeParams({ from: '2026-06-01', to: '2026-06-30' }, TODAY)).toEqual({
      from: '2026-06-01',
      to: '2026-06-30',
    })
  })

  it('only one of from/to present falls back (both-or-neither)', () => {
    expect(parseRangeParams({ from: '2026-06-01' }, TODAY)).toEqual({ from: '2026-08-01', to: '2026-08-10' })
  })
})
