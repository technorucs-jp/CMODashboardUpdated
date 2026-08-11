import { describe, expect, it } from 'vitest'
import { sumMetric } from './aggregate'

describe('aggregate.ts (item 1.16)', () => {
  it('throws when summing a non-additive metric (reach) over a 2-day range', () => {
    const rows = [
      { date: '2026-06-10', value: 2970 },
      { date: '2026-06-11', value: 3100 },
    ]
    expect(() => sumMetric('meta.reach', rows)).toThrow(/non-additive/)
  })

  it('returns the value when summing reach over a single day', () => {
    const rows = [{ date: '2026-06-10', value: 2970 }]
    expect(sumMetric('meta.reach', rows)).toBe(2970)
  })

  it('sums an additive metric (spend) across any number of days without throwing', () => {
    const rows = [
      { date: '2026-06-10', value: 100 },
      { date: '2026-06-11', value: 200 },
      { date: '2026-06-12', value: 50 },
    ]
    expect(sumMetric('meta.spend', rows)).toBe(350)
  })

  it('ga4.totalUsers (also non-additive) behaves the same as reach', () => {
    const rows = [
      { date: '2026-06-10', value: 214 },
      { date: '2026-06-11', value: 260 },
    ]
    expect(() => sumMetric('ga4.totalUsers', rows)).toThrow(/non-additive/)
  })
})
