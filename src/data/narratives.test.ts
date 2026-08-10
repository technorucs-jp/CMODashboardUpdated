import { describe, expect, it } from 'vitest'
import { flagIdSchema, narrativesFileSchema } from './schemas'

const validPhrasing = {
  headline: '{subject} at ₹{costPerConv} per conversation',
  body: 'Spent ₹{spend} for {conversations} messaging replies — {multiple}× the account average.',
  tier: 'immediate',
  authoredBy: 'cowork',
  authoredAt: '2026-08-10T09:05:00+05:30',
}

describe('flagIdSchema / narrativesFileSchema (item 1.8)', () => {
  it('accepts real flag IDs from TAD §10.1', () => {
    const ids = [
      'meta.adset.cost-per-conv-outlier',
      'meta.adset.spend-no-conversions',
      'zoho.status.stuck-in-attempted',
      'zoho.owner.concentration',
      'gsc.brand-dominance',
      'gsc.zero-click-opportunity',
      'linkedin.coverage.competitor-lead',
      'channel.status.degraded',
    ]
    for (const id of ids) {
      expect(flagIdSchema.safeParse(id).success).toBe(true)
    }
  })

  it('rejects a date-range-signature key (ADR-004 — the exact bug this schema prevents)', () => {
    expect(flagIdSchema.safeParse('2026-06-01_2026-06-30_vs_2026-05-01_2026-05-31').success).toBe(false)
  })

  it('parses a well-formed narratives file keyed by flag ID', () => {
    const file = {
      schemaVersion: 1,
      phrasings: { 'meta.adset.cost-per-conv-outlier': validPhrasing },
    }
    expect(narrativesFileSchema.safeParse(file).success).toBe(true)
  })

  it('rejects a file with a phrasing keyed by a range signature', () => {
    const file = {
      schemaVersion: 1,
      phrasings: { '2026-06-01_2026-06-30_vs_2026-05-01_2026-05-31': validPhrasing },
    }
    expect(narrativesFileSchema.safeParse(file).success).toBe(false)
  })
})
