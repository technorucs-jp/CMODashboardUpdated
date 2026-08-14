import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { queryMetaAds } from '../channels/metaAds'
import { queryGa4 } from '../channels/ga4'
import { queryGsc } from '../channels/gsc'
import { queryLinkedIn } from '../channels/linkedin'
import { queryZoho } from '../channels/zoho'
import { evaluateRules } from './engine'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'tests', 'fixtures')
const CONFIG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'public', 'data', 'config')

const metaAdsFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'meta-ads.json'), 'utf8'))
const ga4File = JSON.parse(readFileSync(join(FIXTURES_DIR, 'ga4.json'), 'utf8'))
const gscFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'gsc.json'), 'utf8'))
const linkedinFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'linkedin.json'), 'utf8'))
const zohoFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'zoho-crm.json'), 'utf8'))
const brandTerms = JSON.parse(readFileSync(join(CONFIG_DIR, 'brand-terms.json'), 'utf8')).terms

const JUNE = { from: '2026-06-01', to: '2026-06-30' }

function getJuneContext() {
  return {
    metaAds: queryMetaAds(metaAdsFile, JUNE).data,
    ga4: queryGa4(ga4File, JUNE).data,
    gsc: queryGsc(gscFile, JUNE, brandTerms).data,
    linkedin: queryLinkedIn(linkedinFile, JUNE).data,
    zoho: queryZoho(zohoFile, JUNE).data,
    channelStatuses: [{ channel: 'seo', status: 'action-needed' as const, reason: 'Non-brand clicks down 80.5% MoM' }],
  }
}

describe('Rules Engine (items 4.1 to 4.13; TAD §10.1)', () => {
  it('item 4.1 — engine is a pure function returning Flag[]', () => {
    const flags = evaluateRules(getJuneContext())
    expect(Array.isArray(flags)).toBe(true)
    expect(flags.length).toBeGreaterThan(0)
    for (const flag of flags) {
      expect(flag.id).toMatch(/^[a-z0-9]+(\.[a-z0-9][a-z0-9-]*)+$/)
      expect(flag.channel).toBeDefined()
      expect(flag.severity).toMatch(/^(positive|watch|critical)$/)
      expect(flag.tier).toMatch(/^(immediate|process|strategic|observation)$/)
      expect(flag.subject).toBeTruthy()
      expect(typeof flag.values).toBe('object')
      expect(flag.ruleVersion).toBe(1)
    }
  })

  it('item 4.2 — meta.adset.cost-per-conv-outlier fires on BC Australia 17 Jun, silent on Azure TN', () => {
    const flags = evaluateRules(getJuneContext())
    const outlierFlag = flags.find((f) => f.id === 'meta.adset.cost-per-conv-outlier')
    expect(outlierFlag).toBeDefined()
    expect(outlierFlag!.subject).toContain('Business Central — Australia')
    expect(outlierFlag!.values.costPerConv).toBeCloseTo(1923.21, 0)
    expect(Number(outlierFlag!.values.multiple)).toBeGreaterThanOrEqual(4.0)

    // Verify it does NOT flag Azure TN
    const azureOutlier = flags.find(
      (f) => f.id === 'meta.adset.cost-per-conv-outlier' && f.subject.includes('Azure'),
    )
    expect(azureOutlier).toBeUndefined()
  })

  it('item 4.3 — meta.adset.spend-no-conversions fires on BC Australia Video (₹1,616, 0 conv)', () => {
    const flags = evaluateRules(getJuneContext())
    const spendNoConvFlag = flags.find((f) => f.id === 'meta.adset.spend-no-conversions')
    expect(spendNoConvFlag).toBeDefined()
    expect(spendNoConvFlag!.subject).toContain('Video')
    expect(spendNoConvFlag!.values.spend).toBeCloseTo(1616, 0)
    expect(spendNoConvFlag!.values.conversations).toBe(0)
  })

  it('item 4.4 — meta.adset.audience-overlap fires on June BC Australia ad sets', () => {
    const flags = evaluateRules(getJuneContext())
    const overlapFlag = flags.find((f) => f.id === 'meta.adset.audience-overlap')
    expect(overlapFlag).toBeDefined()
    expect(overlapFlag!.values.count).toBeGreaterThanOrEqual(3)
    expect(overlapFlag!.values.region).toBe('AU')
    expect(overlapFlag!.values.product).toBe('Business Central')
  })

  it('item 4.5 — zoho.status.stuck-in-attempted fires on June (55.1% attempted)', () => {
    const flags = evaluateRules(getJuneContext())
    const stuckFlag = flags.find((f) => f.id === 'zoho.status.stuck-in-attempted')
    expect(stuckFlag).toBeDefined()
    expect(stuckFlag!.values.attemptedCount).toBe(27)
    expect(stuckFlag!.values.attemptedSharePct).toBeCloseTo(55.1, 1)
  })

  it('item 4.6 — zoho.owner.concentration fires on June (Gopinath 43 of 49)', () => {
    const flags = evaluateRules(getJuneContext())
    const concFlag = flags.find((f) => f.id === 'zoho.owner.concentration')
    expect(concFlag).toBeDefined()
    expect(concFlag!.values.owner).toBe('Gopinath')
    expect(concFlag!.values.leadCount).toBe(43)
    expect(concFlag!.values.concentrationPct).toBeCloseTo(87.8, 1)
  })

  it('item 4.7 — zoho.meetings.zero fires on June (0 meetings, 49 leads)', () => {
    const flags = evaluateRules(getJuneContext())
    const meetingFlag = flags.find((f) => f.id === 'zoho.meetings.zero')
    expect(meetingFlag).toBeDefined()
    expect(meetingFlag!.values.meetings).toBe(0)
    expect(meetingFlag!.values.totalLeads).toBe(49)
  })

  it('item 4.8 — ga4.paid.no-attribution fires on June (Meta spend > 0, Paid Social sessions = 0)', () => {
    const flags = evaluateRules(getJuneContext())
    const noAttrFlag = flags.find((f) => f.id === 'ga4.paid.no-attribution')
    expect(noAttrFlag).toBeDefined()
    expect(noAttrFlag!.values.metaSpend).toBeCloseTo(38423.31, 0)
    expect(noAttrFlag!.values.paidSocialSessions).toBe(0)
  })

  it('item 4.9 — ga4.country.suspected-bot fires on China (67.2%, 2s), silent on India', () => {
    const flags = evaluateRules(getJuneContext())
    const botFlag = flags.find((f) => f.id === 'ga4.country.suspected-bot')
    expect(botFlag).toBeDefined()
    expect(botFlag!.values.country).toBe('CN')
    expect(botFlag!.values.bounceRatePct).toBeCloseTo(67.2, 1)

    // Silent on India
    const indiaBot = flags.find((f) => f.id === 'ga4.country.suspected-bot' && f.values.country === 'India')
    expect(indiaBot).toBeUndefined()
  })

  it('item 4.10 — gsc.brand-dominance fires on June (91% brand share)', () => {
    const flags = evaluateRules(getJuneContext())
    const brandDomFlag = flags.find((f) => f.id === 'gsc.brand-dominance')
    expect(brandDomFlag).toBeDefined()
    expect(brandDomFlag!.values.brandSharePct).toBeCloseTo(91.0, 1)
  })

  it('item 4.11 — gsc.zero-click-opportunity fires on azure migration consultant cluster', () => {
    const flags = evaluateRules(getJuneContext())
    const zeroClickFlag = flags.find((f) => f.id === 'gsc.zero-click-opportunity')
    expect(zeroClickFlag).toBeDefined()
    expect(zeroClickFlag!.values.query).toContain('azure migration consultant')
    expect(zeroClickFlag!.values.impressions).toBe(148)
    expect(zeroClickFlag!.values.position).toBeCloseTo(61.8, 1)
  })

  it('item 4.12 — linkedin.coverage.competitor-lead fires on June (58.0 vs 15.0)', () => {
    const flags = evaluateRules(getJuneContext())
    const compLeadFlag = flags.find((f) => f.id === 'linkedin.coverage.competitor-lead')
    expect(compLeadFlag).toBeDefined()
    expect(compLeadFlag!.values.selfReactionsPerPost).toBeCloseTo(58.0, 1)
    expect(compLeadFlag!.values.competitorReactionsPerPost).toBeCloseTo(15.0, 1)
  })

  it('item 4.13 — channel.status.degraded fires when channel status is action-needed', () => {
    const flags = evaluateRules(getJuneContext())
    const degradedFlag = flags.find((f) => f.id === 'channel.status.degraded')
    expect(degradedFlag).toBeDefined()
    expect(degradedFlag!.values.channel).toBe('seo')
    expect(degradedFlag!.values.status).toBe('action-needed')
  })
})
