import { describe, expect, it } from 'vitest'
import { ga4DailySchema } from './schemas'

const validDaily = {
  date: '2026-06-15',
  totalUsers: 214,
  sessions: 267,
  screenPageViews: 401,
  engagedSessions: 174,
  bouncedSessions: 93,
  totalSessionDurationSec: 28569,
}

describe('ga4DailySchema (item 1.5)', () => {
  it('parses a well-formed daily row', () => {
    expect(ga4DailySchema.safeParse(validDaily).success).toBe(true)
  })

  it('rejects a row with a stored bounceRate (P1 — rates are never stored)', () => {
    const withRate = { ...validDaily, bounceRate: 0.348 }
    expect(ga4DailySchema.safeParse(withRate).success).toBe(false)
  })

  it('rejects a row with a stored engagementRate or averageSessionDuration', () => {
    expect(ga4DailySchema.safeParse({ ...validDaily, engagementRate: 0.652 }).success).toBe(false)
    expect(ga4DailySchema.safeParse({ ...validDaily, averageSessionDuration: 107 }).success).toBe(false)
  })
})
