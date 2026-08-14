import { describe, expect, it } from 'vitest'
import { TZDate } from '@date-fns/tz'
import { computeSyncHealth, getHealthSnapshot, formatIstTimestamp } from './health'

describe('Client-side Data Health & Freshness (item 5.12; TAD §8.1)', () => {
  const referenceNow = new TZDate('2026-08-14T12:00:00Z', 'Asia/Kolkata')

  it('computes fresh level when within normal cadence', () => {
    const meta = {
      meta: {
        lastSyncedAt: '2026-08-14T09:00:00Z', // 3 hours ago
        latestRecordDate: '2026-08-13',
        rowCounts: { facts: 120 },
      },
    }

    const health = computeSyncHealth('meta-ads', meta, referenceNow)
    expect(health.level).toBe('fresh')
    expect(health.isStale).toBe(false)
    expect(health.ageHours).toBe(3)
  })

  it('computes delayed level when past 2x cadence', () => {
    const meta = {
      meta: {
        lastSyncedAt: '2026-08-12T08:00:00Z', // 52 hours ago (cadence 24h)
        latestRecordDate: '2026-08-11',
      },
    }

    const health = computeSyncHealth('meta-ads', meta, referenceNow)
    expect(health.level).toBe('delayed')
    expect(health.isStale).toBe(false)
  })

  it('computes stale level when past 4x cadence', () => {
    const meta = {
      meta: {
        lastSyncedAt: '2026-08-05T00:00:00Z', // > 9 days ago
        latestRecordDate: '2026-08-04',
      },
    }

    const health = computeSyncHealth('meta-ads', meta, referenceNow)
    expect(health.level).toBe('stale')
    expect(health.isStale).toBe(true)
  })

  it('handles null/missing envelope with stale state', () => {
    const health = computeSyncHealth('zoho-crm', null, referenceNow)
    expect(health.level).toBe('stale')
    expect(health.isStale).toBe(true)
    expect(health.formattedIst).toBe('Never synced')
  })

  it('getHealthSnapshot returns all requested channels', () => {
    const snapshot = getHealthSnapshot(
      {
        'meta-ads': { meta: { lastSyncedAt: '2026-08-14T10:00:00Z' } },
        'zoho-crm': null,
      },
      referenceNow,
    )

    expect(snapshot['meta-ads']?.level).toBe('fresh')
    expect(snapshot['zoho-crm']?.level).toBe('stale')
  })

  it('formatIstTimestamp renders in IST', () => {
    const formatted = formatIstTimestamp('2026-08-14T03:30:00Z')
    expect(formatted).toContain('09:00')
    expect(formatted).toContain('IST')
  })
})
