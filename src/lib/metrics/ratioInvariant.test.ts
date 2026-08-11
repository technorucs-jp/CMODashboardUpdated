import { describe, expect, it } from 'vitest'
import { ratio, resolve, sumRatios } from './ratio'

/**
 * TASK.md §9's core trap, demonstrated directly: "averaging an average" over-weights
 * low-traffic days. A 3-day fixture where two low-volume days both have a high CTR
 * and one high-volume day has a near-zero CTR — the naive daily mean is pulled
 * toward the low-volume days' 10%, while the correct range CTR (Σclicks/Σimpressions)
 * is dominated by the high-volume day's near-zero rate, as it should be.
 */
const dailyFixture = [
  { clicks: 10, impressions: 100 }, // CTR 10%
  { clicks: 1, impressions: 1000 }, // CTR 0.1% — the high-volume day
  { clicks: 5, impressions: 50 }, // CTR 10%
]

describe('Ratio invariant (item 1.14)', () => {
  it('range CTR (Σclicks/Σimpressions) differs from the naive mean of daily CTRs', () => {
    const dailyCtrs = dailyFixture.map((d) => resolve(ratio(d.clicks, d.impressions))!)
    const naiveMean = dailyCtrs.reduce((a, b) => a + b, 0) / dailyCtrs.length

    const rangeRatio = sumRatios(dailyFixture.map((d) => ratio(d.clicks, d.impressions)))
    const rangeCtr = resolve(rangeRatio)!

    // The correct, impression-weighted value.
    expect(rangeCtr).toBeCloseTo(16 / 1150)
    // And it must not be the naive per-day mean — that's the whole point of the invariant.
    expect(rangeCtr).not.toBeCloseTo(naiveMean, 3)
    expect(naiveMean).toBeCloseTo((0.1 + 0.001 + 0.1) / 3)
  })
})
