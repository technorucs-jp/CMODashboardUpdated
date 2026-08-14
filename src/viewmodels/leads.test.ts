import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildLeadsViewModel } from './leads'
import { zohoCrmFileSchema } from '@/data/schemas'
import type { ZohoCrmFileShape } from '@/lib/channels/zoho'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIXTURE_PATH = join(ROOT, 'tests', 'fixtures', 'zoho-crm.json')
const rawFixtureText = readFileSync(FIXTURE_PATH, 'utf8')
const fixture: ZohoCrmFileShape = JSON.parse(rawFixtureText)

const roster: readonly string[] = (
  JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'config', 'sales-reps.json'), 'utf8')) as {
    reps: { name: string; active: boolean }[]
  }
).reps.filter((r) => r.active).map((r) => r.name)

const JUNE = { from: '2026-06-01', to: '2026-06-30' }

function card(vm: ReturnType<typeof buildLeadsViewModel>, label: string) {
  const c = vm.overviewCards?.find((x) => x.label === label)
  if (!c) throw new Error(`no overview card labelled ${label}`)
  return c
}

describe('P3′ — `notes` never reaches the browser or this view model (item 3.7)', () => {
  it('the raw shipped fixture file contains no `notes` key at all', () => {
    expect(rawFixtureText).not.toMatch(/"notes"/)
  })

  it('the raw fixture contains no known pre-pivot lead free-text', () => {
    // The note string the pre-pivot build's intent-bucket analysis quoted.
    expect(rawFixtureText.toLowerCase()).not.toContain('how does the software work')
  })

  it('the PARSED file — i.e. the exact shape the browser receives — has no `notes` on any lead', () => {
    const parsed = zohoCrmFileSchema.parse(JSON.parse(rawFixtureText))
    for (const lead of parsed.leads) {
      expect(Object.keys(lead)).not.toContain('notes')
    }
  })

  it('a file carrying a `notes` field fails the .strict() schema before this view model ever sees it', () => {
    const withNotes = JSON.parse(rawFixtureText)
    withNotes.leads[0].notes = 'How does the software work for multiple sites?'
    expect(zohoCrmFileSchema.safeParse(withNotes).success).toBe(false)
  })

  it('the serialised view model contains no lead free-text', () => {
    const vm = buildLeadsViewModel(fixture, JUNE, roster)
    const serialised = JSON.stringify(vm)
    expect(serialised).not.toMatch(/"notes"/)
    expect(serialised.toLowerCase()).not.toContain('how does the software work')
  })
})

describe('buildLeadsViewModel — overview cards (items 3.8, 3.9; Wireframe/02-leads-top.jpg)', () => {
  const vm = buildLeadsViewModel(fixture, JUNE, roster)

  it('total inbound leads reads 49', () => {
    expect(card(vm, 'Total inbound leads').value).toBe('49')
  })

  it('Meta Ads 48 (98% of inbound), SEO 1 (2%)', () => {
    expect(card(vm, 'Meta Ads leads').value).toBe('48')
    expect(card(vm, 'Meta Ads leads').detail).toBe('97.96% of inbound')
    expect(card(vm, 'SEO leads').value).toBe('1')
    expect(card(vm, 'SEO leads').detail).toBe('2.04% of inbound')
  })

  it('contact rate reads 30.6% (15 of 49) — item 3.9', () => {
    expect(card(vm, 'Contacted').value).toBe('15')
    expect(card(vm, 'Contacted').detail).toBe('30.61% contact rate')
  })

  it('Attempted 27 (55.1% stuck here)', () => {
    expect(card(vm, 'Attempted').value).toBe('27')
    expect(card(vm, 'Attempted').detail).toBe('55.10% stuck here')
  })

  it('Lost / not interested 7 (14.3% lost rate)', () => {
    expect(card(vm, 'Lost / not interested').value).toBe('7')
    expect(card(vm, 'Lost / not interested').detail).toBe('14.29% lost rate')
  })

  it('Active days reads 16 of 30 in range', () => {
    expect(card(vm, 'Active days').value).toBe('16')
    expect(card(vm, 'Active days').detail).toBe('of 30 days in range')
  })

  it('**Contact in Future and Junk render as 0, not omitted** — the BRD v2.1 §7.1 bug this item exists to fix', () => {
    // 02-leads-top.jpg shows only 8 cards, silently dropping both of these.
    expect(card(vm, 'Contact in Future').value).toBe('0')
    expect(card(vm, 'Junk').value).toBe('0')
    expect(card(vm, 'Meetings scheduled').value).toBe('0')
  })

  it('zero-count sources also render rather than disappearing', () => {
    expect(card(vm, 'Social Media leads').value).toBe('0')
    expect(card(vm, 'Email Campaign leads').value).toBe('0')
  })
})

describe('buildLeadsViewModel — source breakdown (item 3.10)', () => {
  const vm = buildLeadsViewModel(fixture, JUNE, roster)

  it('June reads Meta Ads 48 (98%), SEO 1 (2%)', () => {
    const meta = vm.sourceBreakdown!.find((r) => r.source === 'Meta Ads')!
    const seo = vm.sourceBreakdown!.find((r) => r.source === 'SEO')!
    expect(meta.count).toBe(48)
    expect(Math.round(meta.sharePercent)).toBe(98)
    expect(seo.count).toBe(1)
    expect(Math.round(seo.sharePercent)).toBe(2)
  })

  it('all four inbound sources appear in a fixed order, including the zero ones', () => {
    expect(vm.sourceBreakdown!.map((r) => r.source)).toEqual(['Meta Ads', 'SEO', 'Social Media', 'Email Campaign'])
  })

  it('shares sum to 100%', () => {
    expect(vm.sourceBreakdown!.reduce((s, r) => s + r.sharePercent, 0)).toBeCloseTo(100, 6)
  })
})

describe('buildLeadsViewModel — Meta Ads status donut (item 3.11)', () => {
  const vm = buildLeadsViewModel(fixture, JUNE, roster)

  it('June reads Attempted 27 (56%), Contacted 14 (29%), Lost 7 (15%) of 48 Meta leads', () => {
    const rows = vm.metaStatusBreakdown!
    const attempted = rows.find((r) => r.status === 'Attempted to Contact')!
    const contacted = rows.find((r) => r.status === 'Contacted')!
    const lost = rows.find((r) => r.status === 'Lost / Not interested')!

    expect(attempted.count).toBe(27)
    expect(Math.round(attempted.sharePercent)).toBe(56)
    expect(contacted.count).toBe(14) // 15 total contacted minus the 1 SEO lead
    expect(Math.round(contacted.sharePercent)).toBe(29)
    expect(lost.count).toBe(7)
    expect(Math.round(lost.sharePercent)).toBe(15)
  })
})

describe('buildLeadsViewModel — all-inbound status distribution (item 3.12)', () => {
  const vm = buildLeadsViewModel(fixture, JUNE, roster)

  it('matches 02-leads-top.jpg: Attempted 27 (55.1%), Contacted 15 (30.6%), Lost 7 (14.3%)', () => {
    const rows = vm.allStatusBreakdown!
    expect(rows.find((r) => r.status === 'Attempted to Contact')!.shareDisplay).toBe('55.10%')
    expect(rows.find((r) => r.status === 'Contacted')!.shareDisplay).toBe('30.61%')
    expect(rows.find((r) => r.status === 'Lost / Not interested')!.shareDisplay).toBe('14.29%')
  })

  it('lists all six statuses in a fixed order, zero-count ones included', () => {
    expect(vm.allStatusBreakdown!.map((r) => r.status)).toEqual([
      'Contacted',
      'Attempted to Contact',
      'Lost / Not interested',
      'Contact in Future',
      'Junk',
      'Meeting Scheduled',
    ])
  })
})

describe('buildLeadsViewModel — daily inbound volume (item 3.13)', () => {
  const vm = buildLeadsViewModel(fixture, JUNE, roster)

  it('renders 30 day slots for June — one per day in range, not one per day with data', () => {
    expect(vm.dailyVolume).toHaveLength(30)
    expect(vm.dailyVolume![0].date).toBe('2026-06-01')
    expect(vm.dailyVolume![29].date).toBe('2026-06-30')
  })

  it('16 of those 30 days are active — the gaps stay visible as zero-total slots', () => {
    expect(vm.dailyVolume!.filter((d) => d.total > 0)).toHaveLength(16)
    expect(vm.dailyVolume!.filter((d) => d.total === 0)).toHaveLength(14)
  })

  it('peak day is Jun 15 with 6 leads, per the wireframe caption', () => {
    const peak = [...vm.dailyVolume!].sort((a, b) => b.total - a.total)[0]
    expect(peak.date).toBe('2026-06-15')
    expect(peak.total).toBe(6)
  })

  it('the single SEO lead lands on Jun 8, where the wireframe draws the green segment', () => {
    const jun8 = vm.dailyVolume!.find((d) => d.date === '2026-06-08')!
    expect(jun8.bySource['SEO']).toBe(1)
  })

  it('daily totals sum to the headline 49', () => {
    expect(vm.dailyVolume!.reduce((s, d) => s + d.total, 0)).toBe(49)
  })
})

describe('buildLeadsViewModel — sales rep table (item 3.14; Wireframe/02-leads-mid.jpg)', () => {
  const vm = buildLeadsViewModel(fixture, JUNE, roster)

  it('Gopinath reads 43 assigned / 12 contacted / 24 attempted / 7 lost / 0 meetings / 27.9%', () => {
    const g = vm.repTable!.find((r) => r.rep === 'Gopinath')!
    expect(g.assigned).toBe(43)
    expect(g.contacted).toBe(12)
    expect(g.attempted).toBe(24)
    expect(g.lost).toBe(7)
    expect(g.meetings).toBe(0)
    expect(g.contactRateDisplay).toBe('27.91%')
  })

  it('Jeevanantham J. reads 6 assigned / 3 contacted / 3 attempted / 0 lost / 50.0%', () => {
    const j = vm.repTable!.find((r) => r.rep === 'Jeevanantham J.')!
    expect(j.assigned).toBe(6)
    expect(j.contacted).toBe(3)
    expect(j.attempted).toBe(3)
    expect(j.lost).toBe(0)
    expect(j.contactRateDisplay).toBe('50.00%')
  })

  it('**Rathish, Mohan and Ram appear with 0 / "Not assigned"** — the single-point-of-failure finding depends on these rows existing', () => {
    for (const name of ['Rathish', 'Mohan', 'Ram']) {
      const row = vm.repTable!.find((r) => r.rep === name)
      expect(row, `${name} must have a row even with zero leads`).toBeDefined()
      expect(row!.assigned).toBe(0)
      expect(row!.contactRateDisplay).toBe('Not assigned')
      expect(row!.unassigned).toBe(true)
    }
  })

  it('a zero-assignment rep shows — for counts, distinguishing "no leads routed" from "0 contacted"', () => {
    const rathish = vm.repTable!.find((r) => r.rep === 'Rathish')!
    expect(rathish.contactedDisplay).toBe('—')
    expect(rathish.attemptedDisplay).toBe('—')
    expect(rathish.lostDisplay).toBe('—')
  })

  it('assigned counts across the table sum to the headline 49 — no lead is dropped', () => {
    expect(vm.repTable!.reduce((s, r) => s + r.assigned, 0)).toBe(49)
  })

  it('an owner missing from the roster still gets a row, so their leads are never silently lost', () => {
    const shortRoster = ['Gopinath'] // Jeevanantham J. deliberately omitted
    const shortVm = buildLeadsViewModel(fixture, JUNE, shortRoster)
    expect(shortVm.repTable!.find((r) => r.rep === 'Jeevanantham J.')).toBeDefined()
    expect(shortVm.repTable!.reduce((s, r) => s + r.assigned, 0)).toBe(49)
  })

  it('88% of inbound sits with one rep — the concentration finding is computable from this table', () => {
    const g = vm.repTable!.find((r) => r.rep === 'Gopinath')!
    expect(Math.round((g.assigned / 49) * 100)).toBe(88)
  })
})

describe('buildLeadsViewModel — intent buckets stay unclassified (item 3.16, TAD §16.1)', () => {
  const vm = buildLeadsViewModel(fixture, JUNE, roster)

  it('intentBuckets is null — neither classifier is implemented, by decision', () => {
    expect(vm.intentBuckets).toBeNull()
  })

  it('reports how many leads are unclassified so the panel can say so concretely', () => {
    expect(vm.unclassifiedLeadCount).toBe(49)
  })
})

describe('buildLeadsViewModel — coverage (P4)', () => {
  it('a range entirely before earliestRecordDate renders no data, not zeros', () => {
    const vm = buildLeadsViewModel(fixture, { from: '2026-04-01', to: '2026-04-30' }, roster)
    expect(vm.hasData).toBe(false)
    expect(vm.overviewCards).toBeNull()
    expect(vm.repTable).toBeNull()
    expect(vm.coverage.kind).toBe('none')
  })
})
