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

  it('an ad set with spend and zero conversions resolves cost/conversation to null, not 0 (item 2.18/4.3)', () => {
    const result = queryMetaAds(fixture, { from: '2026-06-22', to: '2026-06-22' })
    const videoFacts = result.data!.facts.filter((f) => f.adSetId === 'as-bc-au-video-22jun')
    expect(videoFacts.length).toBeGreaterThan(0)
    expect(videoFacts.every((f) => f.conversations === 0)).toBe(true)
  })

  it('the BC Australia 17 Jun outlier (item 4.2, TAD §10.2) has cost/conversation exactly ₹1,923.21', () => {
    const result = queryMetaAds(fixture, { from: '2026-06-01', to: '2026-06-30' })
    const outlierFacts = result.data!.facts.filter((f) => f.adSetId === 'as-bc-au-17jun')
    const spend = outlierFacts.reduce((s, f) => s + f.spend, 0)
    const conversations = outlierFacts.reduce((s, f) => s + f.conversations, 0)
    expect(conversations).toBe(1)
    expect(spend / conversations).toBeCloseTo(1923.21, 1)
  })

  it('summing reach across all 13 ad sets gives 58,392 — the wireframe\'s own double-counted figure, not the true 52,527 (documents why item 2.16 refuses to sum reach)', () => {
    const result = queryMetaAds(fixture, { from: '2026-06-01', to: '2026-06-30' })
    const naiveSummedReach = result.data!.facts.reduce((s, f) => s + f.reach, 0)
    expect(naiveSummedReach).toBe(58392)
    expect(naiveSummedReach).not.toBe(52527) // the true account-level reach for the same period
  })
})
