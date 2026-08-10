import { describe, expect, it } from 'vitest'
import { gscDailySchema, gscQuerySchema } from './schemas'

const validDaily = {
  date: '2026-06-20',
  clicks: 18,
  impressions: 2140,
  sumPosition: 64213,
  rows: 2131,
}

describe('gscDailySchema / gscQuerySchema (item 1.6)', () => {
  it('parses a well-formed daily row', () => {
    expect(gscDailySchema.safeParse(validDaily).success).toBe(true)
  })

  it('accepts the optional truncated flag', () => {
    expect(gscDailySchema.safeParse({ ...validDaily, truncated: true }).success).toBe(true)
  })

  it('rejects a row with a stored position (P1 — must be sumPosition)', () => {
    const withPosition = { ...validDaily, position: 28.2 }
    expect(gscDailySchema.safeParse(withPosition).success).toBe(false)
  })

  it('rejects a query row with position instead of sumPosition', () => {
    const withPosition = {
      date: '2026-06-20',
      query: 'dynamics 365 finance and operations',
      clicks: 0,
      impressions: 562,
      position: 28.2,
    }
    expect(gscQuerySchema.safeParse(withPosition).success).toBe(false)
  })
})
