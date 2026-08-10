import { describe, expect, it } from 'vitest'
import { metaAdsFileSchema } from './schemas'

const validFile = {
  schemaVersion: 1,
  meta: {
    channel: 'meta-ads',
    lastSyncedAt: '2026-08-10T09:03:11+05:30',
    earliestRecordDate: '2026-05-01',
    latestRecordDate: '2026-08-09',
    syncSource: 'Meta Marketing API',
    coworkRunId: 'run_2026-08-10T0900',
    rowCounts: { facts: 1 },
  },
  dimensions: {
    adSets: [
      {
        adSetId: '1203',
        adSetName: 'Construction Co. Australia',
        campaignId: '1201',
        campaignName: 'Construction AU',
        launchDate: '2026-06-11',
        region: 'AU',
      },
    ],
  },
  facts: [
    {
      date: '2026-06-11',
      adSetId: '1203',
      country: 'AU',
      spend: 9255.62,
      impressions: 5368,
      reach: 2970,
      clicks: 105,
      conversations: 22,
    },
  ],
  account: [{ date: '2026-06-11', opportunityScore: 100, recommendations: [] }],
}

describe('metaAdsFileSchema (item 1.3)', () => {
  it('parses a well-formed file', () => {
    expect(metaAdsFileSchema.safeParse(validFile).success).toBe(true)
  })

  it('rejects a fact row containing a stored cpc (P1 — ratios are never stored)', () => {
    const withCpc = {
      ...validFile,
      facts: [{ ...validFile.facts[0], cpc: 88.15 }],
    }
    expect(metaAdsFileSchema.safeParse(withCpc).success).toBe(false)
  })

  it('rejects a fact row containing cpm, ctr, or frequency', () => {
    for (const field of ['cpm', 'ctr', 'frequency'] as const) {
      const withField = {
        ...validFile,
        facts: [{ ...validFile.facts[0], [field]: 1 }],
      }
      expect(metaAdsFileSchema.safeParse(withField).success).toBe(false)
    }
  })
})
