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

  it('queries[] is optional — a fixture without it (e.g. the skewed 2-day one above) still parses', () => {
    const noQueries = {
      meta: { earliestRecordDate: '2026-06-01', latestRecordDate: '2026-06-01' },
      daily: [{ date: '2026-06-01', clicks: 5, impressions: 50, sumPosition: 250, rows: 20 }],
      devices: [],
      pages: [],
      countries: [],
    }
    const result = queryGsc(noQueries, { from: '2026-06-01', to: '2026-06-01' })
    expect(result.data!.summary.nonBrandClicks).toBe(0) // no queries[] slice at all → nothing to classify as non-brand
    expect(resolve(result.data!.summary.brandClickShare)).toBe(0) // 0 brand clicks / 5 total clicks = 0%, not null (denominator is nonzero)
  })

  describe('brand vs. non-brand (item 3.28) — computed from queries[], config passed in at render time (P6)', () => {
    const BRAND_TERMS = ['technorucs', 'techno rucs', 'technorucs private limited']

    it('June: 91% brand share (against the authoritative clicks total), 42 non-brand clicks', () => {
      const result = queryGsc(fixture, { from: '2026-06-01', to: '2026-06-30' }, BRAND_TERMS)
      const { summary } = result.data!
      expect(summary.nonBrandClicks).toBe(42)
      expect(resolve(summary.brandClickShare)! * 100).toBeCloseTo(91.0, 1)
    })

    it('May: 215 non-brand clicks (no brand query present that month) — the -80.5% MoM figure vs June', () => {
      const result = queryGsc(fixture, { from: '2026-05-01', to: '2026-05-31' }, BRAND_TERMS)
      const { summary } = result.data!
      expect(summary.nonBrandClicks).toBe(215)
      const juneResult = queryGsc(fixture, { from: '2026-06-01', to: '2026-06-30' }, BRAND_TERMS)
      const pctChange = ((juneResult.data!.summary.nonBrandClicks - summary.nonBrandClicks) / summary.nonBrandClicks) * 100
      expect(pctChange).toBeCloseTo(-80.5, 1)
    })

    it('a query matching by substring is classified as brand even if it is not an exact config entry', () => {
      const withVariant = {
        meta: { earliestRecordDate: '2026-06-01', latestRecordDate: '2026-06-01' },
        daily: [{ date: '2026-06-01', clicks: 10, impressions: 100, sumPosition: 500, rows: 5 }],
        devices: [],
        pages: [],
        countries: [],
        queries: [{ date: '2026-06-01', query: 'technorucs private limited reviews', clicks: 7, impressions: 50, sumPosition: 200 }],
      }
      const result = queryGsc(withVariant, { from: '2026-06-01', to: '2026-06-01' }, ['technorucs'])
      expect(result.data!.summary.nonBrandClicks).toBe(0)
      expect(resolve(result.data!.summary.brandClickShare)! * 100).toBeCloseTo(70, 0) // 7 of 10 total clicks
    })

    it('an empty brand-terms list classifies every query as non-brand', () => {
      const result = queryGsc(fixture, { from: '2026-06-01', to: '2026-06-30' }, [])
      expect(result.data!.summary.nonBrandClicks).toBe(469) // all 8 named June queries, brand-term list empty
      expect(resolve(result.data!.summary.brandClickShare)).toBe(0)
    })

    it('editing the brand-terms list changes the split with no re-sync of the data (item 3.28)', () => {
      // Same file, same range — the only thing that differs between these two calls
      // is the brandTerms argument, demonstrating the split is config-driven at
      // render time rather than baked into the shipped JSON at ingestion.
      const withoutPowerBi = queryGsc(fixture, { from: '2026-06-01', to: '2026-06-30' }, BRAND_TERMS)
      const withPowerBiTreatedAsBrand = queryGsc(fixture, { from: '2026-06-01', to: '2026-06-30' }, [...BRAND_TERMS, 'power bi consulting india'])

      expect(withoutPowerBi.data!.summary.nonBrandClicks).toBe(42)
      // Reclassifying "power bi consulting india" (20 clicks) as brand moves it out
      // of non-brand — 42 − 20 = 22 — with no change to the underlying file.
      expect(withPowerBiTreatedAsBrand.data!.summary.nonBrandClicks).toBe(22)
    })
  })
})
