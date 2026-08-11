import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from '../metrics/ratio'
import { queryGsc } from './gsc'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'tests', 'fixtures')
const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'gsc.json'), 'utf8'))

describe('queryGsc (item 1.22)', () => {
  it('filtering to June 2026 returns the hand-calculated golden totals', () => {
    const result = queryGsc(fixture, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.coverage.kind).toBe('lagging') // GSC always lags — item 3.29
    const { summary } = result.data!

    expect(summary.clicks).toBe(469)
    expect(summary.impressions).toBe(54744)
    expect(resolve(summary.avgPosition)).toBeCloseTo(30.1, 1)
    expect(resolve(summary.mobileClickShare)! * 100).toBeCloseTo(39.9, 1)
    expect(summary.indexedPages).toBe(25)
    expect(summary.countriesReached).toBe(15)
  })

  it('a full-coverage range wraps as "lagging" with dataAsOf === latestRecordDate', () => {
    const result = queryGsc(fixture, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.coverage).toMatchObject({ kind: 'lagging', dataAsOf: fixture.meta.latestRecordDate })
  })

  it('avg position is impression-weighted — Σ sumPosition ÷ Σ impressions, not the daily mean', () => {
    const result = queryGsc(fixture, { from: '2026-06-01', to: '2026-06-30' })
    const bySums =
      result.data!.daily.reduce((s, d) => s + d.sumPosition, 0) / result.data!.daily.reduce((s, d) => s + d.impressions, 0)
    expect(resolve(result.data!.summary.avgPosition)).toBeCloseTo(bySums, 6)
  })

  it('item 1.25 — a dedicated 2-day fixture where the weighted average visibly differs from the daily mean', () => {
    const skewed = {
      meta: { earliestRecordDate: '2026-06-01', latestRecordDate: '2026-06-02' },
      daily: [
        { date: '2026-06-01', clicks: 5, impressions: 50, sumPosition: 50 * 5, rows: 20 }, // position 5, low volume
        { date: '2026-06-02', clicks: 50, impressions: 5000, sumPosition: 5000 * 60, rows: 200 }, // position 60, high volume
      ],
      devices: [],
      pages: [],
      countries: [],
    }
    const result = queryGsc(skewed, { from: '2026-06-01', to: '2026-06-02' })
    const naiveMean = (5 + 60) / 2 // 32.5 — over-weights the low-volume day
    const weighted = resolve(result.data!.summary.avgPosition)! // (250 + 300000) / 5050 ≈ 59.45
    expect(weighted).toBeCloseTo((250 + 300000) / 5050, 2)
    expect(weighted).not.toBeCloseTo(naiveMean, 0)
  })

  it('a range entirely before earliestRecordDate yields no data', () => {
    const result = queryGsc(fixture, { from: '2026-04-01', to: '2026-04-30' })
    expect(result.coverage.kind).toBe('none')
    expect(result.data).toBeNull()
  })
})
