import { describe, expect, it } from 'vitest'
import { compare, percentagePointDelta } from './compare'

describe('compare.ts (item 1.17)', () => {
  it('100 -> 101 is flat (within the ±2% band)', () => {
    const d = compare(101, 100, 'higher-better')
    expect(d.direction).toBe('flat')
    expect(d.pct).toBeCloseTo(1)
  })

  it('100 -> 0 is down with pct === -100', () => {
    const d = compare(0, 100, 'higher-better')
    expect(d.direction).toBe('down')
    expect(d.pct).toBe(-100)
  })

  it('0 -> 50 has pct === null (renders "new", not an infinite percent)', () => {
    const d = compare(50, 0, 'higher-better')
    expect(d.pct).toBeNull()
    expect(d.direction).toBe('undefined')
    expect(d.favourable).toBeNull()
  })

  it('0 -> 0 is flat with pct 0 (nothing changed)', () => {
    const d = compare(0, 0, 'higher-better')
    expect(d.pct).toBe(0)
    expect(d.direction).toBe('flat')
  })

  it('favourable derives from direction x polarity — up is favourable for higher-better', () => {
    expect(compare(150, 100, 'higher-better').favourable).toBe(true)
    expect(compare(50, 100, 'higher-better').favourable).toBe(false)
  })

  it('favourable inverts for lower-better metrics (e.g. cost/conversation)', () => {
    expect(compare(150, 100, 'lower-better').favourable).toBe(false)
    expect(compare(50, 100, 'lower-better').favourable).toBe(true)
  })

  it('neutral-polarity metrics have no favourable/unfavourable concept', () => {
    expect(compare(150, 100, 'neutral').favourable).toBeNull()
    expect(compare(50, 100, 'neutral').favourable).toBeNull()
  })

  it('exactly at the ±2% boundary is still flat', () => {
    expect(compare(102, 100, 'higher-better').direction).toBe('flat')
    expect(compare(98, 100, 'higher-better').direction).toBe('flat')
  })
})

describe('percentagePointDelta (item 3.6)', () => {
  it('contact rate 14.1%→30.6% is +16.5pp, not the relative +117% compare() would give', () => {
    const currentPct = (15 / 49) * 100 // 30.6122...
    const comparisonPct = (9 / 64) * 100 // 14.0625
    expect(percentagePointDelta(currentPct, comparisonPct)).toBeCloseTo(16.5, 1)
    // Contrast with the relative interpretation, which would be misleading for a rate metric.
    expect(compare(currentPct, comparisonPct, 'higher-better').pct).toBeCloseTo(117.7, 0)
  })

  it('is simple subtraction — negative when the rate fell', () => {
    expect(percentagePointDelta(65.3, 65.4)).toBeCloseTo(-0.1, 5)
  })

  it('zero when both values are equal', () => {
    expect(percentagePointDelta(50, 50)).toBe(0)
  })
})
