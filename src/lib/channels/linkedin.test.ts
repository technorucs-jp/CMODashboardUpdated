import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from '../metrics/ratio'
import { competitorReactionsPerPost, queryLinkedIn } from './linkedin'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'tests', 'fixtures')
const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'linkedin.json'), 'utf8'))

describe('queryLinkedIn (item 1.22)', () => {
  it('filtering to June 2026 (fully covered by the upload) returns the hand-calculated golden totals', () => {
    const result = queryLinkedIn(fixture, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.coverage.kind).toBe('full')
    const { summary } = result.data!

    expect(summary.newFollowers).toBe(132)
    expect(summary.pageViews).toBe(2349)
    expect(summary.impressions).toBe(16374)
    expect(summary.clicks).toBe(2099)
    expect(summary.reactions).toBe(522)
    expect(summary.comments).toBe(7)
    expect(summary.postsPublished).toBe(9)
    expect(resolve(summary.reactionsPerPost)).toBeCloseTo(58.0, 1)
  })

  it('a range 15 Jun-15 Jul against a June-only upload returns requires-full-coverage with gap 1-15 Jul (item 1.27)', () => {
    const result = queryLinkedIn(fixture, { from: '2026-06-15', to: '2026-07-15' })
    expect(result.coverage).toEqual({
      kind: 'requires-full-coverage',
      gaps: [{ from: '2026-07-01', to: '2026-07-15' }],
    })
    expect(result.data).toBeNull() // hard warning state — never a silent clip (BRD §4.2)
  })

  it('a range entirely outside the upload also requires full coverage, with the whole range as the gap', () => {
    const result = queryLinkedIn(fixture, { from: '2026-08-01', to: '2026-08-10' })
    expect(result.coverage).toEqual({ kind: 'requires-full-coverage', gaps: [{ from: '2026-08-01', to: '2026-08-10' }] })
  })

  it('the competitor comparison table matches TechnoRUCS vs BytesTechnolab (item 3.37/4.12)', () => {
    const result = queryLinkedIn(fixture, { from: '2026-06-01', to: '2026-06-30' })
    const technorucsRpp = resolve(result.data!.summary.reactionsPerPost)!
    const competitor = fixture.competitors[0]
    const competitorRpp = resolve(competitorReactionsPerPost(competitor))!
    expect(technorucsRpp).toBeCloseTo(58.0, 1)
    expect(competitorRpp).toBeCloseTo(15.0, 1)
    expect(technorucsRpp).toBeGreaterThan(competitorRpp) // Leading vs Behind
  })

  it('the top post\'s engagement rate is (clicks+reactions+comments)/impressions, matching 45.2%', () => {
    const result = queryLinkedIn(fixture, { from: '2026-06-01', to: '2026-06-30' })
    const top = [...result.data!.posts].sort((a, b) => b.impressions - a.impressions)[0]
    const engagementRate = (top.clicks + top.reactions + top.comments) / top.impressions
    expect(engagementRate * 100).toBeCloseTo(45.2, 1)
  })
})
