import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from '../metrics/ratio'
import { queryGa4 } from './ga4'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'tests', 'fixtures')
const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'ga4.json'), 'utf8'))

describe('queryGa4 (item 1.22)', () => {
  it('filtering to June 2026 returns the hand-calculated golden totals', () => {
    const result = queryGa4(fixture, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.coverage.kind).toBe('full')
    const { summary } = result.data!

    expect(summary.sessions).toBe(1720)
    expect(summary.screenPageViews).toBe(2513)
    expect(summary.engagedSessions).toBe(1123)
    expect(summary.bouncedSessions).toBe(597)
    expect(resolve(summary.engagementRate)! * 100).toBeCloseTo(65.3, 1)
    expect(resolve(summary.bounceRate)! * 100).toBeCloseTo(34.7, 1)
    expect(resolve(summary.avgSessionDuration)).toBeCloseTo(107, 0)
    expect(resolve(summary.pagesPerSession)).toBeCloseTo(1.46, 2)
    expect(summary.countriesReached).toBe(71)
  })

  it('totalUsers respects additive:false — null for a multi-day range', () => {
    const result = queryGa4(fixture, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.data!.summary.totalUsers).toBeNull()
  })

  it('totalUsers is a real number for a single-day range', () => {
    const result = queryGa4(fixture, { from: '2026-06-10', to: '2026-06-10' })
    expect(typeof result.data!.summary.totalUsers).toBe('number')
  })

  it('bounce rate is computed from summed counts (Σbounced/Σsessions), matching the ratio.ts mechanism', () => {
    const result = queryGa4(fixture, { from: '2026-06-01', to: '2026-06-30' })
    const bounced = result.data!.daily.reduce((sum, d) => sum + d.bouncedSessions, 0)
    const sessions = result.data!.daily.reduce((sum, d) => sum + d.sessions, 0)
    expect(resolve(result.data!.summary.bounceRate)).toBeCloseTo(bounced / sessions, 6)
  })

  it('item 1.26 — a dedicated 2-day fixture where the range bounce rate visibly differs from the daily mean', () => {
    const skewed = {
      meta: { earliestRecordDate: '2026-06-01', latestRecordDate: '2026-06-02' },
      daily: [
        { date: '2026-06-01', totalUsers: 10, sessions: 10, screenPageViews: 15, engagedSessions: 2, bouncedSessions: 8, totalSessionDurationSec: 100 }, // 80% bounce, low volume
        { date: '2026-06-02', totalUsers: 500, sessions: 1000, screenPageViews: 1800, engagedSessions: 900, bouncedSessions: 100, totalSessionDurationSec: 150000 }, // 10% bounce, high volume
      ],
      channels: [],
      countries: [],
    }
    const result = queryGa4(skewed, { from: '2026-06-01', to: '2026-06-02' })
    const naiveMean = (0.8 + 0.1) / 2 // 45% — over-weights the low-volume day
    const weighted = resolve(result.data!.summary.bounceRate)! // (8+100)/(10+1000) ≈ 10.7%
    expect(weighted).toBeCloseTo(108 / 1010, 4)
    expect(weighted).not.toBeCloseTo(naiveMean, 1)
  })
})
