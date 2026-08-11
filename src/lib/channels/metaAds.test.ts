import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from '../metrics/ratio'
import { queryMetaAds } from './metaAds'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'tests', 'fixtures')
const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'meta-ads.json'), 'utf8'))

describe('queryMetaAds (item 1.22)', () => {
  it('filtering to June 2026 returns the hand-calculated golden totals', () => {
    const result = queryMetaAds(fixture, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.coverage.kind).toBe('full')
    expect(result.data).not.toBeNull()

    const { summary } = result.data!
    expect(summary.spend).toBeCloseTo(38423.31, 1)
    expect(summary.impressions).toBe(95823)
    expect(summary.clicks).toBe(655)
    expect(summary.conversations).toBe(101)
    expect(resolve(summary.costPerConversation)).toBeCloseTo(380.43, 1)
    expect(resolve(summary.cpc)).toBeCloseTo(58.66, 1)
    expect(resolve(summary.cpm)).toBeCloseTo(401, 0)
  })

  it('reach is null for a multi-day range (non-additive, item 2.16)', () => {
    const result = queryMetaAds(fixture, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.data!.summary.reach).toBeNull()
  })

  it('reach is a real number for a single-day range', () => {
    const result = queryMetaAds(fixture, { from: '2026-06-10', to: '2026-06-10' })
    expect(result.data!.summary.reach).not.toBeNull()
    expect(typeof result.data!.summary.reach).toBe('number')
  })

  it('a range entirely before earliestRecordDate (2026-05-01) yields no data', () => {
    const result = queryMetaAds(fixture, { from: '2026-04-01', to: '2026-04-30' })
    expect(result.coverage.kind).toBe('none')
    expect(result.data).toBeNull()
  })

  it('an ad set with spend and zero conversions resolves cost/conversation to null, not 0', () => {
    const result = queryMetaAds(fixture, { from: '2026-06-22', to: '2026-06-22' })
    const videoFacts = result.data!.facts.filter((f) => f.adSetId === 'as-bc-au-22jun-video')
    expect(videoFacts.length).toBeGreaterThan(0)
    expect(videoFacts.every((f) => f.conversations === 0)).toBe(true)
  })
})
