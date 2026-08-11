import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from '../metrics/ratio'
import { queryZoho } from './zoho'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'tests', 'fixtures')
const fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'zoho-crm.json'), 'utf8'))

describe('queryZoho (item 1.22)', () => {
  it('filtering to June 2026 returns the hand-calculated golden totals', () => {
    const result = queryZoho(fixture, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.coverage.kind).toBe('full')
    const { summary } = result.data!

    expect(summary.totalInbound).toBe(49)
    expect(summary.contacted).toBe(15)
    expect(summary.attempted).toBe(27)
    expect(summary.lost).toBe(7)
    expect(summary.contactInFuture).toBe(0)
    expect(summary.junk).toBe(0)
    expect(summary.meetingsScheduled).toBe(0)
    expect(summary.activeDays).toBe(16)
    expect(resolve(summary.contactRate)! * 100).toBeCloseTo(30.6, 1)
  })

  it('a lead at 2026-06-01T00:15:00+05:30 lands in June, not May (timezone trap, item 1.23)', () => {
    const withEdgeLead = {
      ...fixture,
      leads: [
        ...fixture.leads,
        {
          leadId: 'edge-1',
          createdTime: '2026-06-01T00:15:00+05:30',
          leadSource: 'Meta Ads',
          leadStatus: 'Attempted to Contact',
          owner: 'Gopinath',
          inquiryType: null,
        },
      ],
    }
    const june = queryZoho(withEdgeLead, { from: '2026-06-01', to: '2026-06-30' })
    const may = queryZoho(withEdgeLead, { from: '2026-05-01', to: '2026-05-31' })
    expect(june.data!.leads.some((l) => l.leadId === 'edge-1')).toBe(true)
    expect(may.data!.leads.some((l) => l.leadId === 'edge-1')).toBe(false)
  })

  it('a Partner lead is excluded defensively at query time, even if it slipped into the file (item 1.24)', () => {
    const withPartner = {
      ...fixture,
      leads: [
        ...fixture.leads,
        {
          leadId: 'partner-1',
          createdTime: '2026-06-15T10:00:00+05:30',
          leadSource: 'Partner',
          leadStatus: 'Contacted',
          owner: 'Gopinath',
          inquiryType: null,
        },
      ],
    }
    const result = queryZoho(withPartner, { from: '2026-06-01', to: '2026-06-30' })
    expect(result.data!.summary.totalInbound).toBe(49) // unchanged — Partner lead excluded
    expect(result.data!.leads.some((l) => l.leadId === 'partner-1')).toBe(false)
  })

  it('every returned lead has no notes field — the query result cannot carry one either way (P3′)', () => {
    const result = queryZoho(fixture, { from: '2026-06-01', to: '2026-06-30' })
    for (const lead of result.data!.leads) {
      expect(lead).not.toHaveProperty('notes')
    }
  })
})
