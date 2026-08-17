import { describe, expect, it } from 'vitest'
import type { MetaAdsQueryResult } from '../channels/metaAds'
import { composeTabNarrative } from './compose'

/**
 * Regression test for the duplicate-key bug: `evaluateRules` emits one flag per
 * subject for several rules (e.g. meta.adset.spend-no-conversions fires once per
 * ad set), all sharing the same rule-type `id`. ActionList/NarrativeBlock key
 * their lists on `NarrativeRenderResult.id`, so two ad sets tripping the same
 * rule used to collide on one React key and silently drop a row.
 */
function metaAdsWithTwoZeroConvAdSets(): MetaAdsQueryResult {
  return {
    adSets: [
      { adSetId: 'as1', adSetName: 'Ad Set One', campaignId: 'c1', campaignName: 'Campaign', launchDate: '2026-06-01', region: 'India' },
      { adSetId: 'as2', adSetName: 'Ad Set Two', campaignId: 'c1', campaignName: 'Campaign', launchDate: '2026-06-01', region: 'India' },
    ],
    facts: [
      { date: '2026-06-01', adSetId: 'as1', country: 'IN', spend: 1000, impressions: 500, reach: 400, clicks: 50, conversations: 0 },
      { date: '2026-06-01', adSetId: 'as2', country: 'IN', spend: 800, impressions: 300, reach: 250, clicks: 40, conversations: 0 },
    ],
    account: [],
    summary: { spend: 1800, impressions: 800, reach: 650, clicks: 90, conversations: 0 },
  } as unknown as MetaAdsQueryResult
}

describe('composeTabNarrative — duplicate rule-instance keys', () => {
  it('gives every rendered flag a unique id even when the same rule fires for multiple subjects', () => {
    const rendered = composeTabNarrative('meta-ads', { metaAds: metaAdsWithTwoZeroConvAdSets() }, null)

    const spendNoConv = rendered.filter((f) => f.id === 'meta.adset.spend-no-conversions' || f.id.startsWith('meta.adset.spend-no-conversions#'))
    expect(spendNoConv).toHaveLength(2)

    const ids = rendered.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps the first occurrence of a rule id unchanged (no suffix) for the common single-instance case', () => {
    const single: MetaAdsQueryResult = {
      adSets: [{ adSetId: 'as1', adSetName: 'Ad Set One', campaignId: 'c1', campaignName: 'Campaign', launchDate: '2026-06-01', region: 'India' }],
      facts: [{ date: '2026-06-01', adSetId: 'as1', country: 'IN', spend: 1000, impressions: 500, reach: 400, clicks: 50, conversations: 0 }],
      account: [],
      summary: { spend: 1000, impressions: 500, reach: 400, clicks: 50, conversations: 0 },
    } as unknown as MetaAdsQueryResult

    const rendered = composeTabNarrative('meta-ads', { metaAds: single }, null)
    const flag = rendered.find((f) => f.id === 'meta.adset.spend-no-conversions')
    expect(flag).toBeDefined()
  })
})
