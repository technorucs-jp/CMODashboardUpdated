import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTotalLeadsViewModel } from './totalLeads'
import type { MetaAdsFileShape } from '@/lib/channels/metaAds'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIXTURE_PATH = join(ROOT, 'tests', 'fixtures', 'meta-ads.json')
const rawFixtureText = readFileSync(FIXTURE_PATH, 'utf8')
const fixture: MetaAdsFileShape = JSON.parse(rawFixtureText)

const JUNE = { from: '2026-06-01', to: '2026-06-30' }
const MAY = { from: '2026-05-01', to: '2026-05-31' }

describe('buildTotalLeadsViewModel — comparison required & fallback (item 3.41)', () => {
  it('falls back to previous period of equal length when requested comparison is null', () => {
    const vm = buildTotalLeadsViewModel(fixture, JUNE, null)
    expect(vm.isFallbackComparison).toBe(true)
    expect(vm.comparisonLabel).toContain('Comparing to previous period')
    expect(vm.comparisonRange.to).toBe('2026-05-31')
  })

  it('uses explicit comparison range when provided', () => {
    const vm = buildTotalLeadsViewModel(fixture, JUNE, MAY)
    expect(vm.isFallbackComparison).toBe(false)
    expect(vm.comparisonLabel).toContain('Comparing to 2026-05-01 to 2026-05-31')
    expect(vm.comparisonRange).toEqual(MAY)
  })
})

describe('buildTotalLeadsViewModel — headline comparison cards (item 3.42; Wireframe/10-totalleads-top.jpg)', () => {
  const vm = buildTotalLeadsViewModel(fixture, JUNE, MAY)

  it('Total conversations reads 101 vs 178 with -43.26% change', () => {
    const card = vm.cards?.find((c) => c.label.includes('conversations'))
    expect(card).toBeDefined()
    expect(card!.primaryValue).toBe('101')
    expect(card!.comparisonValue).toBe('178')
    expect(card!.changeDisplay).toBe('-43.26%')
  })

  it('Cost / lead reads ₹380.43 vs ₹176.26 with +115.83% change', () => {
    const card = vm.cards?.find((c) => c.label.includes('Cost / lead'))
    expect(card).toBeDefined()
    expect(card!.primaryValue).toBe('₹380.43')
    expect(card!.comparisonValue).toBe('₹176.26')
    expect(card!.changeDisplay).toBe('+115.83%')
  })

  it('Total ad spend reads ₹38,423.31 vs comparison spend', () => {
    const card = vm.cards?.find((c) => c.label.includes('ad spend'))
    expect(card).toBeDefined()
    expect(card!.primaryValue).toBe('₹38,423.31')
    expect(card!.comparisonValue).toBe('₹31,375')
    expect(card!.changeDisplay).toBe('+22.46%')
  })
})

describe('buildTotalLeadsViewModel — campaign breakdown table and totals (item 3.43)', () => {
  const vm = buildTotalLeadsViewModel(fixture, JUNE, MAY)

  it('June totals match 95,823 / 58,392 / 101 / ₹38,423.31 / ₹380.43', () => {
    const t = vm.totals!
    expect(t).toBeDefined()
    expect(t.primary.impressions).toBe(95823)
    expect(t.primary.impressionsDisplay).toBe('95,823')
    expect(t.primary.reach).toBe(58392)
    expect(t.primary.reachDisplay).toBe('58,392')
    expect(t.primary.conversations).toBe(101)
    expect(t.primary.conversationsDisplay).toBe('101')
    expect(t.primary.spendDisplay).toBe('₹38,423.31')
    expect(t.primary.costPerConvDisplay).toBe('₹380.43')
  })

  it('May totals match impressions / reach / 178 / spend / cpc', () => {
    const t = vm.totals!
    expect(t).toBeDefined()
    expect(t.comparison.impressions).toBe(138000)
    expect(t.comparison.reach).toBe(92000)
    expect(t.comparison.conversations).toBe(178)
    expect(t.comparison.conversationsDisplay).toBe('178')
    expect(t.comparison.spendDisplay).toBe('₹31,375')
    expect(t.comparison.costPerConvDisplay).toBe('₹176.26')
  })
})

describe('buildTotalLeadsViewModel — grouped chart data (item 3.44)', () => {
  const vm = buildTotalLeadsViewModel(fixture, JUNE, MAY)

  it('builds grouped conversation comparisons for all campaigns', () => {
    const chart = vm.chartData!
    expect(chart).toBeDefined()
    expect(chart.length).toBeGreaterThan(0)
    for (const point of chart) {
      expect(point.campaignName).toBeTruthy()
      expect(typeof point.primaryConversations).toBe('number')
      expect(typeof point.comparisonConversations).toBe('number')
    }
  })
})
