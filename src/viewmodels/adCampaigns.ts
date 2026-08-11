import { queryMetaAds, type MetaAdsFileShape, type MetaAdsAdSet, type MetaAdsFact } from '@/lib/channels/metaAds'
import type { ChannelResult } from '@/lib/coverage/coverage'
import { formatMetricValue } from '@/lib/metrics/format'
import { ratio, resolve } from '@/lib/metrics/ratio'
import type { DateRange } from '@/lib/time/range'

/**
 * Composes the Ad Campaigns tab's view model (item 2.14) from `queryMetaAds`'s
 * result. Every value here is pre-formatted — `components/` never computes a
 * metric (TAD §11.1); this file is the one place that does, for this tab.
 *
 * Reach AND frequency (which needs reach — impressions ÷ reach) are `null` for
 * any range longer than one day, for the same reason (P1/TAD §9.2): reach is
 * de-duplicated by Meta and cannot be honestly derived from day-granular
 * storage for an arbitrary custom range without a live API call, which this
 * architecture forbids (TAD ADR-011). The pre-pivot checklist's worked example
 * for this exact item expects a live-fetched `1.82×` frequency figure for June
 * — that assumed live API access this build never has. This is a structural,
 * unavoidable consequence of "no backend", not an oversight: see item 2.15's
 * checklist note for the full reasoning.
 */

export interface AdSetTableRow {
  readonly adSetId: string
  readonly name: string
  readonly launchDate: string
  readonly region: string
  readonly spend: number
  readonly spendDisplay: string
  readonly impressions: number
  readonly impressionsDisplay: string
  readonly clicks: number
  readonly clicksDisplay: string
  readonly ctr: number
  readonly ctrDisplay: string
  readonly cpc: string
  readonly cpm: string
  readonly reachDisplay: string
  readonly conversations: number
  readonly conversationsDisplay: string
  readonly costPerConv: number // Infinity when null, so a DataTable sort places it consistently
  readonly costPerConvDisplay: string
}

export interface CountryRow {
  readonly country: string
  readonly spend: number
  readonly spendDisplay: string
  readonly impressions: number
  readonly clicks: number
  readonly reach: number
  readonly ctrDisplay: string
  readonly percentOfBudgetDisplay: string
}

export interface AdCampaignsViewModel {
  readonly coverage: ChannelResult<unknown>['coverage']
  readonly hasData: boolean
  readonly accountCards: {
    readonly spend: string
    readonly impressions: string
    readonly clicks: string
    readonly conversations: string
    readonly cpc: string
    readonly cpm: string
    readonly frequency: string
    readonly costPerConversation: string
    readonly reach: string
  } | null
  readonly adSetTable: readonly AdSetTableRow[] | null
  readonly totalsRow: { spend: string; impressions: string; clicks: string; ctr: string } | null
  readonly countryBreakdown: readonly CountryRow[] | null
  readonly conversationsByAdSet: readonly { name: string; value: number }[] | null
  readonly costPerConvByAdSet: readonly { name: string; value: number | null }[] | null
  readonly accountAverageCostPerConv: number | null
  readonly opportunityScore: number | null
}

function groupBy<T, K>(items: readonly T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const bucket = map.get(key)
    if (bucket) bucket.push(item)
    else map.set(key, [item])
  }
  return map
}

export function buildAdCampaignsViewModel(file: MetaAdsFileShape, range: DateRange): AdCampaignsViewModel {
  const result = queryMetaAds(file, range)

  if (result.data === null) {
    return {
      coverage: result.coverage,
      hasData: false,
      accountCards: null,
      adSetTable: null,
      totalsRow: null,
      countryBreakdown: null,
      conversationsByAdSet: null,
      costPerConvByAdSet: null,
      accountAverageCostPerConv: null,
      opportunityScore: null,
    }
  }

  const { facts, adSets, summary, accountRows } = result.data
  const isMultiDay = range.from !== range.to
  const frequency = isMultiDay || summary.reach === null ? null : summary.impressions / summary.reach

  const accountCards = {
    spend: formatMetricValue(summary.spend, 'currency'),
    impressions: formatMetricValue(summary.impressions, 'integer'),
    clicks: formatMetricValue(summary.clicks, 'integer'),
    conversations: formatMetricValue(summary.conversations, 'integer'),
    cpc: formatMetricValue(resolve(summary.cpc), 'currency'),
    cpm: formatMetricValue(resolve(summary.cpm), 'currency'),
    frequency: formatMetricValue(frequency, 'decimal') + (frequency === null ? '' : '×'),
    costPerConversation: formatMetricValue(resolve(summary.costPerConversation), 'currency'),
    reach: isMultiDay ? 'n/a for multi-day ranges' : formatMetricValue(summary.reach, 'integer'),
  }

  const adSetLookup = new Map<string, MetaAdsAdSet>(adSets.map((a) => [a.adSetId, a]))
  const factsByAdSet = groupBy(facts, (f: MetaAdsFact) => f.adSetId)

  const adSetTable: AdSetTableRow[] = []
  for (const [adSetId, adSetFacts] of factsByAdSet) {
    const dimension = adSetLookup.get(adSetId)
    const spend = adSetFacts.reduce((s, f) => s + f.spend, 0)
    const impressions = adSetFacts.reduce((s, f) => s + f.impressions, 0)
    const clicks = adSetFacts.reduce((s, f) => s + f.clicks, 0)
    const conversations = adSetFacts.reduce((s, f) => s + f.conversations, 0)
    const reachTotal = adSetFacts.length === 1 ? adSetFacts[0].reach : null
    const ctr = resolve(ratio(clicks, impressions))
    const cpc = resolve(ratio(spend, clicks))
    const cpm = resolve(ratio(spend * 1000, impressions))
    const costPerConv = resolve(ratio(spend, conversations))

    adSetTable.push({
      adSetId,
      name: dimension?.adSetName ?? adSetId,
      launchDate: dimension?.launchDate ?? '',
      region: dimension?.region ?? '',
      spend,
      spendDisplay: formatMetricValue(spend, 'currency'),
      impressions,
      impressionsDisplay: formatMetricValue(impressions, 'integer'),
      clicks,
      clicksDisplay: formatMetricValue(clicks, 'integer'),
      ctr: ctr ?? 0,
      ctrDisplay: formatMetricValue(ctr === null ? null : ctr * 100, 'percent'),
      cpc: formatMetricValue(cpc, 'currency'),
      cpm: formatMetricValue(cpm, 'currency'),
      reachDisplay: reachTotal === null ? 'n/a for multi-day ranges' : formatMetricValue(reachTotal, 'integer'),
      conversations,
      conversationsDisplay: formatMetricValue(conversations, 'integer'),
      costPerConv: costPerConv ?? Number.POSITIVE_INFINITY,
      costPerConvDisplay: formatMetricValue(costPerConv, 'currency'),
    })
  }
  adSetTable.sort((a, b) => b.spend - a.spend)

  const totalsRow = {
    spend: formatMetricValue(summary.spend, 'currency'),
    impressions: formatMetricValue(summary.impressions, 'integer'),
    clicks: formatMetricValue(summary.clicks, 'integer'),
    ctr: formatMetricValue(resolve(summary.ctr) === null ? null : resolve(summary.ctr)! * 100, 'percent'),
  }

  const factsByCountry = groupBy(facts, (f: MetaAdsFact) => f.country)
  const countryBreakdown: CountryRow[] = [...factsByCountry.entries()].map(([country, countryFacts]) => {
    const spend = countryFacts.reduce((s, f) => s + f.spend, 0)
    const impressions = countryFacts.reduce((s, f) => s + f.impressions, 0)
    const clicks = countryFacts.reduce((s, f) => s + f.clicks, 0)
    const reach = countryFacts.reduce((s, f) => s + f.reach, 0) // per-country total — same non-additive caveat as the account card
    const ctr = resolve(ratio(clicks, impressions))
    const percentOfBudget = summary.spend === 0 ? 0 : (spend / summary.spend) * 100
    return {
      country,
      spend,
      spendDisplay: formatMetricValue(spend, 'currency'),
      impressions,
      clicks,
      reach,
      ctrDisplay: formatMetricValue(ctr === null ? null : ctr * 100, 'percent'),
      percentOfBudgetDisplay: formatMetricValue(percentOfBudget, 'percent'),
    }
  })
  countryBreakdown.sort((a, b) => b.spend - a.spend)

  const conversationsByAdSet = adSetTable
    .map((row) => ({ name: row.name, value: row.conversations }))
    .sort((a, b) => b.value - a.value)

  const costPerConvByAdSet = adSetTable
    .filter((row) => Number.isFinite(row.costPerConv))
    .map((row) => ({ name: row.name, value: row.costPerConv }))
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))

  const accountAverageCostPerConv = resolve(summary.costPerConversation)

  // Opportunity score is a daily snapshot Cowork captures from Meta's own API
  // (TAD §7.3 account[]), not additive — the range's most recent day's score
  // is the account's *current* state, which is what "opportunity score" means.
  const sortedAccountRows = [...accountRows].sort((a, b) => (a.date < b.date ? -1 : 1))
  const opportunityScore = sortedAccountRows.length > 0 ? sortedAccountRows[sortedAccountRows.length - 1].opportunityScore : null

  return {
    coverage: result.coverage,
    hasData: true,
    accountCards,
    adSetTable,
    totalsRow,
    countryBreakdown,
    conversationsByAdSet,
    costPerConvByAdSet,
    accountAverageCostPerConv,
    opportunityScore,
  }
}
