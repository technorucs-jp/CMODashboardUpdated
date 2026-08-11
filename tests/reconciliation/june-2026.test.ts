import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from '../../src/lib/metrics/ratio'
import { queryMetaAds, type MetaAdsFileShape } from '../../src/lib/channels/metaAds'
import { queryGa4, type Ga4FileShape } from '../../src/lib/channels/ga4'
import { queryGsc, type GscFileShape } from '../../src/lib/channels/gsc'
import { queryLinkedIn, type LinkedInFileShape } from '../../src/lib/channels/linkedin'
import { queryZoho, type ZohoCrmFileShape } from '../../src/lib/channels/zoho'

/**
 * The reconciliation harness (item 1.31, TAD §13) — "can I trust this instead
 * of the static dashboard?" made into a test. Selects the exact June 2026
 * calendar month and asserts every headline KPI against the published golden
 * figures within BRD §16 criterion 3's ±1% tolerance (relative), except the
 * one field noted in the golden file itself where the docs' own two source
 * numbers don't perfectly reconcile with each other.
 */

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')
const GOLDEN_PATH = join(dirname(fileURLToPath(import.meta.url)), 'june-2026.golden.json')

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8')) as T
}

const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'))
const JUNE = { from: '2026-06-01', to: '2026-06-30' }

function withinPct(actual: number, expected: number, pct: number): boolean {
  if (expected === 0) return actual === 0
  return Math.abs((actual - expected) / expected) * 100 <= pct
}

describe('June 2026 reconciliation (item 1.31)', () => {
  it('Meta Ads: spend, impressions, clicks, conversations, cost/conversation', () => {
    const result = queryMetaAds(loadFixture<MetaAdsFileShape>('meta-ads'), JUNE)
    const { summary } = result.data!

    expect(withinPct(summary.spend, golden.metaAds.spend, 1)).toBe(true)
    expect(withinPct(summary.impressions, golden.metaAds.impressions, 1)).toBe(true)
    expect(withinPct(summary.clicks, golden.metaAds.clicks, 1)).toBe(true)
    expect(withinPct(summary.conversations, golden.metaAds.conversations, 1)).toBe(true)
    expect(withinPct(resolve(summary.costPerConversation)!, golden.metaAds.costPerConversation, 1)).toBe(true)
  })

  it('GA4: sessions, engagement rate', () => {
    const result = queryGa4(loadFixture<Ga4FileShape>('ga4'), JUNE)
    const { summary } = result.data!

    expect(withinPct(summary.sessions, golden.ga4.sessions, 1)).toBe(true)
    expect(withinPct(resolve(summary.engagementRate)! * 100, golden.ga4.engagementRatePct, 1)).toBe(true)
  })

  it('GSC: clicks, impressions (CTR tolerated at a wider band — see golden file note)', () => {
    const result = queryGsc(loadFixture<GscFileShape>('gsc'), JUNE)
    const { summary } = result.data!

    expect(withinPct(summary.clicks, golden.gsc.clicks, 1)).toBe(true)
    expect(withinPct(summary.impressions, golden.gsc.impressions, 1)).toBe(true)
    // CTR: the golden file's own two source numbers (clicks/impressions vs. the
    // separately-stated "0.81%") don't perfectly reconcile with each other — see
    // june-2026.golden.json's _ctrNote. Assert our CTR matches clicks/impressions
    // exactly (the only internally-consistent thing to assert), not the stated 0.81%.
    expect(resolve(summary.ctr)! * 100).toBeCloseTo((golden.gsc.clicks / golden.gsc.impressions) * 100, 2)
  })

  it('LinkedIn: new followers, reactions', () => {
    const result = queryLinkedIn(loadFixture<LinkedInFileShape>('linkedin'), JUNE)
    const { summary } = result.data!

    expect(withinPct(summary.newFollowers, golden.linkedin.newFollowers, 1)).toBe(true)
    expect(withinPct(summary.reactions, golden.linkedin.reactions, 1)).toBe(true)
  })

  it('Zoho: total inbound, contact rate', () => {
    const result = queryZoho(loadFixture<ZohoCrmFileShape>('zoho-crm'), JUNE)
    const { summary } = result.data!

    expect(withinPct(summary.totalInbound, golden.zoho.totalInbound, 1)).toBe(true)
    expect(withinPct(resolve(summary.contactRate)! * 100, golden.zoho.contactRatePct, 1)).toBe(true)
  })
})
