import { describe, expect, it } from 'vitest'
import { compare } from './compare'
import { statusOf, type ThresholdsConfig } from './status'

const thresholds: ThresholdsConfig = {
  leading: { favourablePct: 15 },
  good: { withinPct: 5 },
  monitor: { unfavourablePctMin: 5, unfavourablePctMax: 30 },
  actionNeeded: { unfavourablePctMin: 30 },
  flatBand: { pct: 2 },
  targetBands: { 'ga4.engagementRate': { min: 0.6, statusIfMet: 'good' } },
  floors: {},
}

describe('statusOf (item 1.18)', () => {
  it('cost/conversation +116% (₹176.26 -> ₹380.43, lower-better) is action-needed', () => {
    const delta = compare(380.43, 176.26, 'lower-better')
    expect(delta.pct).toBeCloseTo(115.86, 1)
    expect(statusOf('meta.costPerConversation', delta, thresholds)).toBe('action-needed')
  })

  it('sessions +6% (higher-better) is leading — favourable movement outside the good band', () => {
    const delta = compare(106, 100, 'higher-better')
    expect(delta.pct).toBeCloseTo(6)
    expect(statusOf('ga4.sessions', delta, thresholds)).toBe('leading')
  })

  it('engagement rate 65.3% (barely moved from 65.0%) is good', () => {
    const delta = compare(65.3, 65.0, 'higher-better')
    expect(delta.direction).toBe('flat')
    expect(statusOf('ga4.engagementRate', delta, thresholds)).toBe('good')
  })

  it('a target band rescues a metric to good even when its delta alone would read worse', () => {
    // engagement rate fell 12.9% (unfavourable enough to be 'monitor' on delta
    // alone) but 65.3% still clears the configured >=60% floor.
    const delta = compare(65.3, 75, 'higher-better')
    expect(delta.favourable).toBe(false)
    expect(statusOf('ga4.engagementRate', delta, thresholds)).toBe('good')
  })

  it('an unfavourable move below the monitor floor (under 5%) is still good, not monitor', () => {
    const delta = compare(96, 100, 'higher-better') // -4%, unfavourable but small
    expect(statusOf('ga4.sessions', delta, thresholds)).toBe('good')
  })

  it('an unfavourable move of 10% is monitor (between 5% and 30%)', () => {
    const delta = compare(90, 100, 'higher-better')
    expect(statusOf('ga4.sessions', delta, thresholds)).toBe('monitor')
  })

  it('a metric with no baseline (0 -> 50) defaults to good rather than fabricating a verdict', () => {
    const delta = compare(50, 0, 'higher-better')
    expect(statusOf('ga4.sessions', delta, thresholds)).toBe('good')
  })
})
