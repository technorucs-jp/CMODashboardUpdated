import { describe, expect, it } from 'vitest'
import { computeCoverage, isRenderable, toChannelResult } from './coverage'

describe('coverage.ts (item 1.19)', () => {
  it('a range entirely before earliestRecordDate yields {kind: "none"} with data: null', () => {
    const coverage = computeCoverage({ from: '2026-04-01', to: '2026-04-30' }, '2026-05-01', '2026-08-09')
    expect(coverage).toEqual({ kind: 'none', earliest: '2026-05-01', latest: '2026-08-09' })

    const result = toChannelResult(coverage, () => ({ totalUsers: 999 }))
    expect(result.data).toBeNull()
  })

  it('a range with no history at all (nulls) yields none with null earliest/latest', () => {
    const coverage = computeCoverage({ from: '2026-04-01', to: '2026-04-30' }, null, null)
    expect(coverage).toEqual({ kind: 'none', earliest: null, latest: null })
  })

  it('a range fully inside the covered window is full, and data is present', () => {
    const coverage = computeCoverage({ from: '2026-06-01', to: '2026-06-30' }, '2026-05-01', '2026-08-09')
    expect(coverage).toEqual({ kind: 'full' })
    expect(isRenderable(coverage)).toBe(true)

    const result = toChannelResult(coverage, () => ({ totalUsers: 1346 }))
    expect(result.data).toEqual({ totalUsers: 1346 })
  })

  it('a range partially before the covered window clips and reports missingBefore', () => {
    const coverage = computeCoverage({ from: '2026-04-15', to: '2026-05-15' }, '2026-05-01', '2026-08-09')
    expect(coverage).toEqual({
      kind: 'partial',
      available: { from: '2026-05-01', to: '2026-05-15' },
      missingBefore: '2026-05-01',
    })
    expect(isRenderable(coverage)).toBe(true)
  })

  it('a range partially after the covered window clips and reports missingAfter', () => {
    const coverage = computeCoverage({ from: '2026-08-01', to: '2026-08-31' }, '2026-05-01', '2026-08-09')
    expect(coverage).toEqual({
      kind: 'partial',
      available: { from: '2026-08-01', to: '2026-08-09' },
      missingAfter: '2026-08-09',
    })
  })

  it('non-renderable coverage kinds never carry data, even if computeData is provided', () => {
    expect(isRenderable({ kind: 'none', earliest: null, latest: null })).toBe(false)
    expect(isRenderable({ kind: 'requires-full-coverage', gaps: [] })).toBe(false)
    expect(isRenderable({ kind: 'not-connected' })).toBe(false)
  })

  it('lagging (GSC) is renderable — real data with a banner, not a blocking state', () => {
    expect(isRenderable({ kind: 'lagging', dataAsOf: '2026-08-07' })).toBe(true)
  })
})
