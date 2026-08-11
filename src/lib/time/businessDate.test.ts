import { describe, expect, it } from 'vitest'
import { businessDateFromCalendarDate, calendarDateFromBusinessDate, toBusinessDate } from './businessDate'

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

describe('calendarDateFromBusinessDate / businessDateFromCalendarDate (item 2.1)', () => {
  it('round-trips regardless of the test runner\'s own system timezone', () => {
    // Deliberately not asserting against a specific TZ — the whole point of these
    // two functions is to be a matched pair using the *same* local getters/
    // constructor, so the round-trip holds no matter what timezone this runs in.
    for (const d of ['2026-06-01', '2026-06-15', '2026-06-30', '2026-12-31', '2026-01-01']) {
      expect(businessDateFromCalendarDate(calendarDateFromBusinessDate(d))).toBe(d)
    }
  })

  it('calendarDateFromBusinessDate produces a Date whose own local Y/M/D match the digits given', () => {
    const date = calendarDateFromBusinessDate('2026-06-15')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(5) // 0-indexed
    expect(date.getDate()).toBe(15)
  })

  it('does NOT apply toBusinessDate\'s IST shift — this is a naive local extraction, by design', () => {
    // A Date constructed for local midnight of the 15th must read back as the
    // 15th here, even though feeding the equivalent ISO string through
    // toBusinessDate (a genuinely different function, for a genuinely different
    // purpose) could land on a different day depending on the local offset.
    const date = calendarDateFromBusinessDate('2026-06-15')
    expect(businessDateFromCalendarDate(date)).toBe('2026-06-15')
  })
})
