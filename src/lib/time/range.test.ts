import { describe, expect, it } from 'vitest'
import { containsDate, gapsInRange, lengthInDays, mergeIntervals, nextDay, previousPeriodOfEqualLength, rangeSignature } from './range'

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

  // Added while building item 1.22's LinkedIn coverage rule (needed by item 1.27).
  it('nextDay advances one business date, including across a month boundary', () => {
    expect(nextDay('2026-06-15')).toBe('2026-06-16')
    expect(nextDay('2026-06-30')).toBe('2026-07-01')
  })

  it('mergeIntervals merges overlapping and adjacent intervals, leaves disjoint ones apart', () => {
    expect(mergeIntervals([{ from: '2026-06-01', to: '2026-06-15' }, { from: '2026-06-10', to: '2026-06-20' }])).toEqual([
      { from: '2026-06-01', to: '2026-06-20' },
    ])
    expect(mergeIntervals([{ from: '2026-06-01', to: '2026-06-30' }, { from: '2026-07-01', to: '2026-07-31' }])).toEqual([
      { from: '2026-06-01', to: '2026-07-31' },
    ])
    expect(mergeIntervals([{ from: '2026-06-01', to: '2026-06-10' }, { from: '2026-06-20', to: '2026-06-30' }])).toEqual([
      { from: '2026-06-01', to: '2026-06-10' },
      { from: '2026-06-20', to: '2026-06-30' },
    ])
  })

  it('gapsInRange finds the exact missing window (item 1.27\'s worked example)', () => {
    const gaps = gapsInRange({ from: '2026-06-15', to: '2026-07-15' }, [{ from: '2026-06-01', to: '2026-06-30' }])
    expect(gaps).toEqual([{ from: '2026-07-01', to: '2026-07-15' }])
  })

  it('gapsInRange is empty when the range is fully covered', () => {
    expect(gapsInRange(june, [{ from: '2026-05-01', to: '2026-08-09' }])).toEqual([])
  })
})
