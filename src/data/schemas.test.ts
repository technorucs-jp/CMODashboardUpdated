import { describe, expect, it } from 'vitest'
import { envelopeSchema } from './schemas'

describe('envelopeSchema (item 1.2)', () => {
  const validMeta = {
    channel: 'meta-ads',
    lastSyncedAt: '2026-08-10T09:03:11+05:30',
    earliestRecordDate: '2026-05-01',
    latestRecordDate: '2026-08-09',
    syncSource: 'Meta Marketing API',
    coworkRunId: 'run_2026-08-10T0900',
    rowCounts: { facts: 1284 },
  }

  it('parses a well-formed envelope', () => {
    const result = envelopeSchema.safeParse({ schemaVersion: 1, meta: validMeta })
    expect(result.success).toBe(true)
  })

  it('fails with a readable error when meta.latestRecordDate is missing', () => {
    const { latestRecordDate: _drop, ...metaWithoutLatest } = validMeta
    const result = envelopeSchema.safeParse({ schemaVersion: 1, meta: metaWithoutLatest })

    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.path.join('.'))
      expect(messages).toContain('meta.latestRecordDate')
    }
  })
})
