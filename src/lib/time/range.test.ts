import { describe, expect, it } from 'vitest'
import { containsDate, lengthInDays, previousPeriodOfEqualLength, rangeSignature } from './range'

describe('range.ts (item 1.11)', () => {
  const june = { from: '2026-06-01', to: '2026-06-30' }

  it('1-30 June has length 30', () => {
    expect(lengthInDays(june)).toBe(30)
  })

  it('a single day has length 1', () => {
    expect(lengthInDays({ from: '2026-06-15', to: '2026-06-15' })).toBe(1)
  })

  it('previous period of equal length for 1-30 June is 2-31 May', () => {
    expect(previousPeriodOfEqualLength(june)).toEqual({ from: '2026-05-02', to: '2026-05-31' })
  })

  it('containsDate is inclusive at both ends', () => {
    expect(containsDate(june, '2026-06-01')).toBe(true)
    expect(containsDate(june, '2026-06-30')).toBe(true)
    expect(containsDate(june, '2026-06-15')).toBe(true)
    expect(containsDate(june, '2026-05-31')).toBe(false)
    expect(containsDate(june, '2026-07-01')).toBe(false)
  })

  it('rangeSignature is a stable canonical string', () => {
    expect(rangeSignature(june)).toBe('2026-06-01_2026-06-30')
  })
})
