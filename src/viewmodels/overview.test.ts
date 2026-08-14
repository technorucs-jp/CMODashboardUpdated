import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOverviewViewModel, type OverviewSourceFiles } from './overview'
import type { ThresholdsConfig } from '@/lib/metrics/status'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures')
const CONFIG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'config')

function fixtureJson(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8'))
}

const files: OverviewSourceFiles = {
  metaAds: fixtureJson('meta-ads') as OverviewSourceFiles['metaAds'],
  ga4: fixtureJson('ga4') as OverviewSourceFiles['ga4'],
  gsc: fixtureJson('gsc') as OverviewSourceFiles['gsc'],
  linkedin: fixtureJson('linkedin') as OverviewSourceFiles['linkedin'],
  zoho: fixtureJson('zoho-crm') as OverviewSourceFiles['zoho'],
}

const thresholds: ThresholdsConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'thresholds.json'), 'utf8'))
const brandTerms: readonly string[] = (JSON.parse(readFileSync(join(CONFIG_DIR, 'brand-terms.json'), 'utf8')) as { terms: string[] }).terms

const JUNE = { from: '2026-06-01', to: '2026-06-30' }
const MAY = { from: '2026-05-01', to: '2026-05-31' }

function kpi(vm: ReturnType<typeof buildOverviewViewModel>, label: string) {
  const card = vm.kpiCards.find((c) => c.label === label)
  if (!card) throw new Error(`no KPI card labelled ${label}`)
  return card
}

function healthRow(vm: ReturnType<typeof buildOverviewViewModel>, channel: string) {
  const row = vm.channelHealth.find((r) => r.channel === channel)
  if (!row) throw new Error(`no channel-health row for ${channel}`)
  return row
}

function block(vm: ReturnType<typeof buildOverviewViewModel>, title: string) {
  const b = vm.periodComparisonBlocks.find((x) => x.title === title)
  if (!b) throw new Error(`no period-comparison block titled ${title}`)
  return b
}

function blockRow(vm: ReturnType<typeof buildOverviewViewModel>, title: string, label: string) {
  const r = block(vm, title).rows.find((x) => x.label === label)
  if (!r) throw new Error(`no row ${label} in block ${title}`)
  return r
}

describe('buildOverviewViewModel — KPI cards (item 3.2, Wireframe/01-overview-june-b.jpg)', () => {
  const vm = buildOverviewViewModel(files, JUNE, MAY, thresholds, brandTerms)

  it('Ad Spend — ₹38,423, Meta · 101 conv · ₹380/conv', () => {
    const c = kpi(vm, 'Ad Spend')
    expect(c.value).toBe('₹38,423.31')
    expect(c.detail).toBe('Meta · 101 conv · ₹380.43/conv')
  })

  it('Total Leads — 101, Meta Ads conversations · ₹380/lead', () => {
    const c = kpi(vm, 'Total Leads')
    expect(c.value).toBe('101')
    expect(c.detail).toBe('Meta Ads conversations · ₹380.43/lead')
  })

  it('Sessions — 1,720, GA4 · 65.3% engagement (2dp: 65.29%) · 71 countries', () => {
    // formatMetricValue's 'percent' format is a shared, already-established 2dp
    // convention (e.g. Ad Campaigns' CTR "0.68%") — kept consistent here rather
    // than special-cased to match the wireframe's own inconsistent 0/1/2dp mix
    // (65.3%, 30.6%, 91% all appear with different precision in the same screen).
    const c = kpi(vm, 'Sessions')
    expect(c.value).toBe('1,720')
    expect(c.detail).toBe('GA4 · 65.29% engagement · 71 countries')
  })

  it('Organic Clicks — 469, GSC · 54,744 impr', () => {
    const c = kpi(vm, 'Organic Clicks')
    expect(c.value).toBe('469')
    // CTR renders the honestly-computed ~0.86%, not the docs' independently-stated
    // 0.81% — the same documented clicks/impressions rounding inconsistency item
    // 1.20/1.31 already found and chose not to paper over.
    expect(c.detail).toMatch(/^GSC · 54,744 impr · 0\.8[0-9]% CTR$/)
  })

  it('New Followers — 132, LinkedIn · 16,374 impr · 522 reactions', () => {
    const c = kpi(vm, 'New Followers')
    expect(c.value).toBe('132')
    expect(c.detail).toBe('LinkedIn · 16,374 impr · 522 reactions')
  })

  it('Meta Conversations — 101, campaigns · avg CPL', () => {
    const c = kpi(vm, 'Meta Conversations')
    expect(c.value).toBe('101')
    // 9 distinct June campaigns by construction, not the wireframe's "8" — a
    // documented, deliberate deviation (see overview.ts's header comment); this
    // pins the real computed value so a future fixture edit can't silently drift.
    expect(c.detail).toBe('9 campaigns · ₹380.43 avg CPL')
  })

  it('a channel with no data for the range degrades its own card to "—" without blanking the others', () => {
    const future = buildOverviewViewModel(files, { from: '2099-01-01', to: '2099-01-31' }, null, thresholds, brandTerms)
    expect(kpi(future, 'Ad Spend').value).toBe('—')
    expect(kpi(future, 'Sessions').value).toBe('—')
  })
})

describe('buildOverviewViewModel — channel health table (item 3.3, June vs May)', () => {
  const vm = buildOverviewViewModel(files, JUNE, MAY, thresholds, brandTerms)

  it('Ad Campaigns / Meta Ads / Cost-per-conversation: ₹380, +115.8% (wireframe rounds its own unrounded inputs to +115.9%)', () => {
    const r = healthRow(vm, 'Ad Campaigns')
    expect(r.value).toBe('₹380.43')
    // Computed from the precise underlying values (₹176.26 → ₹380.43), not the
    // wireframe's own already-rounded ₹176/₹380 — 115.83% rounds to "115.8%",
    // a tenth of a point off the wireframe's "+115.9%" for exactly that reason.
    expect(r.changeDisplay).toBe('+115.8%')
    // Diverges from the wireframe's hand-assigned "Monitor" — the mechanical,
    // already-tested threshold engine (item 1.18) puts a +115.8% unfavourable
    // move for a lower-better metric well past the 30% action-needed floor.
    // See overview.ts's header comment for the full reasoning.
    expect(r.status).toBe('action-needed')
  })

  it('Total Leads / Meta Ads / Conversations: 101, -43.3%', () => {
    const r = healthRow(vm, 'Total Leads')
    expect(r.value).toBe('101')
    expect(r.changeDisplay).toBe('-43.3%')
    expect(r.status).toBe('action-needed') // same documented divergence as the row above
  })

  it('Website / GA4 / Engagement rate: 65.3% (2dp: 65.29%), flat, Good — matches the wireframe exactly', () => {
    const r = healthRow(vm, 'Website')
    expect(r.value).toBe('65.29%')
    expect(r.changeDisplay).toBe('≈ flat')
    expect(r.status).toBe('good')
  })

  it('SEO / GSC / Non-brand clicks: 42, -80.5%, Action needed — matches the wireframe exactly', () => {
    const r = healthRow(vm, 'SEO')
    expect(r.value).toBe('42')
    expect(r.changeDisplay).toBe('-80.5%')
    expect(r.status).toBe('action-needed')
  })

  it('LinkedIn / Page / Reactions-per-post avg: 58.0 for June, but no May comparison exists (genuine coverage gap)', () => {
    const r = healthRow(vm, 'LinkedIn')
    expect(r.value).toBe('58.00')
    expect(r.changeDisplay).toBe('no data for one period')
    expect(r.status).toBeNull()
  })

  it('falls back to "vs. previous N days" when no comparison range is set (item 3.4)', () => {
    const noComparison = buildOverviewViewModel(files, JUNE, null, thresholds, brandTerms)
    expect(noComparison.comparisonLabel).toBe('vs. previous 30 days')
  })

  it('labels an explicit comparison range by its dates (item 3.4)', () => {
    expect(vm.comparisonLabel).toBe('vs. 2026-05-01 – 2026-05-31')
  })
})

describe('buildOverviewViewModel — period comparison blocks (item 3.5, Wireframe/09-overview-comparemom.jpg)', () => {
  const vm = buildOverviewViewModel(files, JUNE, MAY, thresholds, brandTerms)

  describe('Meta Ads block', () => {
    it('Spend: ₹31,375 → ₹38,423, +22.5%', () => {
      const r = blockRow(vm, 'Meta Ads', 'Spend')
      expect(r.comparisonDisplay).toBe('₹31,375')
      expect(r.currentDisplay).toBe('₹38,423.31')
      expect(r.changeDisplay).toBe('+22.5%')
    })

    it('Conversations: 178 → 101, -43.3%', () => {
      const r = blockRow(vm, 'Meta Ads', 'Conversations')
      expect(r.comparisonDisplay).toBe('178')
      expect(r.currentDisplay).toBe('101')
      expect(r.changeDisplay).toBe('-43.3%')
    })

    it('Cost/conversation: ₹176.26 → ₹380.43, +115.8% (wireframe: +115.9%, off by 0.1pp from its own pre-rounded inputs)', () => {
      const r = blockRow(vm, 'Meta Ads', 'Cost/conversation')
      expect(r.changeDisplay).toBe('+115.8%')
    })

    it('Impressions and CPM land close to (not exactly) the wireframe — documented ~0.2-0.3pp drift from the approximated "138K" source figure', () => {
      const impressions = blockRow(vm, 'Meta Ads', 'Impressions')
      expect(impressions.comparisonDisplay).toBe('1,38,000') // en-IN grouping
      expect(impressions.changeDisplay).toMatch(/^-30\.[0-9]%$/) // wireframe shows -30.8%
      const cpm = blockRow(vm, 'Meta Ads', 'CPM')
      expect(cpm.changeDisplay).toMatch(/^\+76\.[0-9]%$/) // wireframe shows +76.7%
    })
  })

  describe('Leads + Website block', () => {
    it('Contact rate: 14.1% → 30.6%, +16.5pp — not a relative percent', () => {
      const r = blockRow(vm, 'Leads + Website', 'Contact rate')
      expect(r.comparisonDisplay).toBe('14.06%')
      expect(r.currentDisplay).toBe('30.61%')
      expect(r.changeDisplay).toBe('+16.5pp')
    })

    it('Sessions: 1,619 → 1,720, +6.2%', () => {
      const r = blockRow(vm, 'Leads + Website', 'Sessions')
      expect(r.comparisonDisplay).toBe('1,619')
      expect(r.currentDisplay).toBe('1,720')
      expect(r.changeDisplay).toBe('+6.2%')
    })

    it('Engagement rate: 65.4% → 65.3%, flat', () => {
      const r = blockRow(vm, 'Leads + Website', 'Engagement rate')
      expect(r.changeDisplay).toBe('≈ flat')
    })

    it('Avg. session duration: 114s → 107s, -6.1%', () => {
      const r = blockRow(vm, 'Leads + Website', 'Avg. session duration')
      expect(r.comparisonDisplay).toBe('114s')
      expect(r.currentDisplay).toBe('107s')
      expect(r.changeDisplay).toBe('-6.1%')
    })
  })

  describe('LinkedIn + SEO block', () => {
    it('GSC clicks: 453 → 469, +3.5%', () => {
      const r = blockRow(vm, 'LinkedIn + SEO', 'GSC clicks')
      expect(r.comparisonDisplay).toBe('453')
      expect(r.currentDisplay).toBe('469')
      expect(r.changeDisplay).toBe('+3.5%')
    })

    it('GSC impressions: 49,596 → 54,744, +10.4%', () => {
      const r = blockRow(vm, 'LinkedIn + SEO', 'GSC impressions')
      expect(r.changeDisplay).toBe('+10.4%')
    })

    it('Non-brand clicks: 215 → 42, -80.5% — the exact wireframe figure', () => {
      const r = blockRow(vm, 'LinkedIn + SEO', 'Non-brand clicks')
      expect(r.comparisonDisplay).toBe('215')
      expect(r.currentDisplay).toBe('42')
      expect(r.changeDisplay).toBe('-80.5%')
    })

    it('New followers and Reactions show current June figures but no comparison — LinkedIn has no May upload', () => {
      const followers = blockRow(vm, 'LinkedIn + SEO', 'New followers')
      expect(followers.currentDisplay).toBe('132')
      expect(followers.comparisonDisplay).toBe('—')
      expect(followers.changeDisplay).toBe('no data for one period')

      const reactions = blockRow(vm, 'LinkedIn + SEO', 'Reactions')
      expect(reactions.currentDisplay).toBe('522')
      expect(reactions.comparisonDisplay).toBe('—')
      expect(reactions.changeDisplay).toBe('no data for one period')
    })
  })
})
