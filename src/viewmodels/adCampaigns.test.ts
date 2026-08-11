import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAdCampaignsViewModel } from './adCampaigns'
import type { MetaAdsFileShape } from '@/lib/channels/metaAds'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures')
const fixture: MetaAdsFileShape = JSON.parse(readFileSync(join(FIXTURES_DIR, 'meta-ads.json'), 'utf8'))
const JUNE = { from: '2026-06-01', to: '2026-06-30' }

describe('buildAdCampaignsViewModel (items 2.14-2.22)', () => {
  it('account overview cards match the June golden figures (item 2.15)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    expect(vm.accountCards).toEqual({
      spend: '₹38,423.31',
      impressions: '95,823',
      clicks: '655',
      conversations: '101',
      cpc: '₹58.66',
      cpm: '₹400.98', // rounds to the wireframe's displayed ₹401
      frequency: '—', // multi-day — see item 2.15's checklist note on why this can't be 1.82×
      costPerConversation: '₹380.43',
      reach: 'n/a for multi-day ranges',
    })
  })

  it('reach renders "n/a for multi-day ranges" rather than a summed value (item 2.16)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    expect(vm.accountCards!.reach).toBe('n/a for multi-day ranges')
  })

  it('reach is a real figure for a single day', () => {
    const vm = buildAdCampaignsViewModel(fixture, { from: '2026-06-15', to: '2026-06-15' })
    expect(vm.accountCards!.reach).not.toBe('n/a for multi-day ranges')
    expect(vm.accountCards!.reach).not.toBe('—')
  })

  it('the ad-set table totals row reads 38,423.31 / 95,823 / 655 / 0.68% (item 2.17)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    expect(vm.totalsRow!.spend).toBe('₹38,423.31')
    expect(vm.totalsRow!.impressions).toBe('95,823')
    expect(vm.totalsRow!.clicks).toBe('655')
    expect(vm.totalsRow!.ctr).toBe('0.68%')
  })

  it('BC Australia — Video (₹1,615.67 spend, 0 conversions) shows — for cost/conversation, not 0 or Infinity (item 2.18)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    const row = vm.adSetTable!.find((r) => r.name === 'BC Australia — Video')!
    expect(row).toBeDefined()
    expect(row.conversations).toBe(0)
    expect(row.costPerConvDisplay).toBe('—')
    expect(Number.isFinite(row.costPerConv)).toBe(false) // Infinity, so it sorts to one consistent end
  })

  it('the BC Australia 17 Jun outlier reads exactly ₹1,923.21 cost/conversation (item 4.2 preview)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    const row = vm.adSetTable!.find((r) => r.name === 'Business Central — Australia' && r.launchDate === '2026-06-17')!
    expect(row.costPerConvDisplay).toBe('₹1,923.21')
  })

  it('spend-by-country breakdown percentages sum to 100% (item 2.19)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    const total = vm.countryBreakdown!.reduce((s, c) => s + Number.parseFloat(c.percentOfBudgetDisplay), 0)
    expect(total).toBeCloseTo(100, 0)
  })

  it('conversations-by-ad-set is sorted descending (item 2.20)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    const values = vm.conversationsByAdSet!.map((d) => d.value)
    expect(values).toEqual([...values].sort((a, b) => b - a))
    expect(values[0]).toBe(22) // Construction Co. Australia (11 Jun) — the top by conversions
  })

  it('cost-per-conversation-by-ad-set excludes zero-conversion ad sets and includes an account average (item 2.21)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    expect(vm.costPerConvByAdSet!.every((d) => d.value !== null)).toBe(true)
    expect(vm.costPerConvByAdSet!.length).toBe(11) // 13 ad sets minus the 2 with zero conversions
    expect(vm.accountAverageCostPerConv).toBeCloseTo(380.43, 1)
  })

  it('opportunity score reads 100 for June — "Perfect score" per 07-adcampaigns-mid2.jpg (item 2.22)', () => {
    const vm = buildAdCampaignsViewModel(fixture, JUNE)
    expect(vm.opportunityScore).toBe(100)
  })

  it('a range entirely before earliestRecordDate renders no data, not zeros (item 2.23)', () => {
    const vm = buildAdCampaignsViewModel(fixture, { from: '2026-04-01', to: '2026-04-30' })
    expect(vm.hasData).toBe(false)
    expect(vm.accountCards).toBeNull()
    expect(vm.coverage.kind).toBe('none')
  })
})
