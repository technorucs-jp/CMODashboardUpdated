import { describe, expect, it } from 'vitest'
import { toBusinessDate } from './businessDate'

describe('toBusinessDate (item 1.10)', () => {
  it('maps a just-after-midnight IST timestamp to that IST day', () => {
    expect(toBusinessDate('2026-06-01T00:15:00+05:30')).toBe('2026-06-01')
  })

  it('maps a just-before-midnight IST timestamp to the earlier IST day', () => {
    expect(toBusinessDate('2026-05-31T23:45:00+05:30')).toBe('2026-05-31')
  })

  it('maps a UTC-midnight input to the correct IST day (UTC midnight is 05:30 IST, same day)', () => {
    expect(toBusinessDate('2026-06-01T00:00:00Z')).toBe('2026-06-01')
  })

  it('maps a late-UTC input that has already rolled to the next IST day', () => {
    // 2026-06-01T20:00:00Z is 2026-06-02 01:30 IST — the business date must roll forward.
    expect(toBusinessDate('2026-06-01T20:00:00Z')).toBe('2026-06-02')
  })

  it('accepts a Date object as well as a string', () => {
    expect(toBusinessDate(new Date('2026-06-01T00:15:00+05:30'))).toBe('2026-06-01')
  })

  it('throws a readable error on unparseable input', () => {
    expect(() => toBusinessDate('not-a-date')).toThrow(/unparseable/)
  })
})
