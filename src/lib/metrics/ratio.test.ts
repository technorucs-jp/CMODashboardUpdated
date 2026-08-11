import { describe, expect, it } from 'vitest'
import { ratio, resolve, sumRatios } from './ratio'

describe('ratio.ts (item 1.13)', () => {
  it('resolve(ratio(5, 0)) is null — not 0, not Infinity, not NaN', () => {
    const result = resolve(ratio(5, 0))
    expect(result).toBeNull()
    expect(result).not.toBe(0)
    expect(Number.isNaN(result)).toBe(false)
  })

  it('resolve of a normal ratio divides numerator by denominator', () => {
    expect(resolve(ratio(101, 469))).toBeCloseTo(101 / 469)
  })

  it('sumRatios sums numerators and denominators independently, not the ratios themselves', () => {
    const summed = sumRatios([ratio(10, 100), ratio(5, 50)])
    expect(summed).toEqual({ n: 15, d: 150 })
    expect(resolve(summed)).toBeCloseTo(0.1)
  })

  it('Ratio has no arithmetic operators exposed — TypeScript would reject a Ratio + Ratio', () => {
    // This is a compile-time property, not a runtime one; the runtime check here
    // is just that Ratio is a plain data object, nothing more.
    const r = ratio(1, 2)
    expect(Object.keys(r).sort()).toEqual(['d', 'n'])
  })
})
