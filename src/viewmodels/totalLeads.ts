import { composeTabNarrative, type NarrativesMap } from '@/lib/narrative/compose'
import type { NarrativeRenderResult } from '@/lib/narrative/renderer'
import { queryMetaAds, type MetaAdsFileShape, type MetaAdsQueryResult } from '@/lib/channels/metaAds'
import type { ChannelResult } from '@/lib/coverage/coverage'
import { formatMetricValue } from '@/lib/metrics/format'
import { resolve } from '@/lib/metrics/ratio'
import { previousPeriodOfEqualLength, type DateRange } from '@/lib/time/range'

/**
 * View model for the Total Leads tab (items 3.41-3.44). BRD §12.
 *
 * Comparison is REQUIRED on this tab — falls back to previous period of equal length
 * with an explicit label when unset by caller (item 3.41).
 */

export interface TotalLeadsComparisonCard {
  readonly label: string
  readonly primaryValue: string
  readonly comparisonValue: string
  readonly changeDisplay: string
  readonly isPositive: boolean | null
  readonly detail: string
}

export interface CampaignPeriodMetrics {
  readonly impressions: number
  readonly impressionsDisplay: string
  readonly reach: number
  readonly reachDisplay: string
  readonly conversations: number
  readonly conversationsDisplay: string
  readonly spend: number
  readonly spendDisplay: string
  readonly costPerConvDisplay: string
}

export interface CampaignComparisonRow {
  readonly campaignId: string
  readonly campaignName: string
  readonly primary: CampaignPeriodMetrics
  readonly comparison: CampaignPeriodMetrics
  readonly conversationDeltaDisplay: string
}

export interface CampaignComparisonTotals {
  readonly primary: CampaignPeriodMetrics
  readonly comparison: CampaignPeriodMetrics
  readonly conversationDeltaDisplay: string
}

export interface CampaignChartPoint {
  readonly campaignName: string
  readonly primaryConversations: number
  readonly comparisonConversations: number
}

export interface TotalLeadsViewModel {
  readonly coverage: ChannelResult<unknown>['coverage']
  readonly comparisonCoverage: ChannelResult<unknown>['coverage']
  readonly hasData: boolean
  readonly narrativeFlags: readonly NarrativeRenderResult[]
  readonly primaryRange: DateRange
  readonly comparisonRange: DateRange
  readonly isFallbackComparison: boolean
  readonly comparisonLabel: string
  readonly cards: readonly TotalLeadsComparisonCard[] | null
  readonly campaigns: readonly CampaignComparisonRow[] | null
  readonly totals: CampaignComparisonTotals | null
  readonly chartData: readonly CampaignChartPoint[] | null
}

interface CampaignRawAgg {
  impressions: number
  reach: number
  conversations: number
  spend: number
}

function computePercentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return (current - previous) / previous
}

function formatDelta(current: number, previous: number): string {
  const d = computePercentDelta(current, previous)
  if (d === null) return '—'
  const prefix = d > 0 ? '+' : ''
  return `${prefix}${(d * 100).toFixed(2)}%`
}

function aggregateCampaigns(
  result: MetaAdsQueryResult,
): Map<string, { name: string; agg: CampaignRawAgg }> {
  const adSetMap = new Map(result.adSets.map((a) => [a.adSetId, a]))
  const map = new Map<string, { name: string; agg: CampaignRawAgg }>()

  for (const fact of result.facts) {
    const adSet = adSetMap.get(fact.adSetId)
    const campaignId = adSet?.campaignId ?? 'unknown'
    const campaignName = adSet?.campaignName ?? 'Unknown Campaign'

    const existing = map.get(campaignId) ?? {
      name: campaignName,
      agg: { impressions: 0, reach: 0, conversations: 0, spend: 0 },
    }
    existing.agg.impressions += fact.impressions
    existing.agg.reach += fact.reach
    existing.agg.conversations += fact.conversations
    existing.agg.spend += fact.spend
    map.set(campaignId, existing)
  }

  return map
}

function toMetrics(agg: CampaignRawAgg): CampaignPeriodMetrics {
  const cpc = agg.conversations > 0 ? agg.spend / agg.conversations : null
  return {
    impressions: agg.impressions,
    impressionsDisplay: formatMetricValue(agg.impressions, 'integer'),
    reach: agg.reach,
    reachDisplay: formatMetricValue(agg.reach, 'integer'),
    conversations: agg.conversations,
    conversationsDisplay: formatMetricValue(agg.conversations, 'integer'),
    spend: agg.spend,
    spendDisplay: formatMetricValue(agg.spend, 'currency'),
    costPerConvDisplay: formatMetricValue(cpc, 'currency'),
  }
}

export function buildTotalLeadsViewModel(
  file: MetaAdsFileShape,
  range: DateRange,
  requestedComparisonRange?: DateRange | null,
  narratives?: NarrativesMap | null,
): TotalLeadsViewModel {
  const isFallbackComparison = !requestedComparisonRange
  const effectiveComparisonRange = requestedComparisonRange ?? previousPeriodOfEqualLength(range)

  const primaryResult = queryMetaAds(file, range)
  const compResult = queryMetaAds(file, effectiveComparisonRange)

  const comparisonLabel = isFallbackComparison
    ? `Comparing to previous period (${effectiveComparisonRange.from} to ${effectiveComparisonRange.to}) [auto-selected]`
    : `Comparing to ${effectiveComparisonRange.from} to ${effectiveComparisonRange.to}`

  if (primaryResult.data === null || compResult.data === null) {
    return {
      coverage: primaryResult.coverage,
      comparisonCoverage: compResult.coverage,
      hasData: false,
      narrativeFlags: [],
      primaryRange: range,
      comparisonRange: effectiveComparisonRange,
      isFallbackComparison,
      comparisonLabel,
      cards: null,
      campaigns: null,
      totals: null,
      chartData: null,
    }
  }

  const prim = primaryResult.data
  const comp = compResult.data

  const primAggs = aggregateCampaigns(prim)
  const compAggs = aggregateCampaigns(comp)

  // --- Campaign Comparison rows (item 3.43)
  const allCampaignIds = new Set([...primAggs.keys(), ...compAggs.keys()])
  const campaignRows: CampaignComparisonRow[] = []

  const primTotalAgg: CampaignRawAgg = { impressions: 0, reach: 0, conversations: 0, spend: 0 }
  const compTotalAgg: CampaignRawAgg = { impressions: 0, reach: 0, conversations: 0, spend: 0 }

  for (const cid of allCampaignIds) {
    const p = primAggs.get(cid)
    const c = compAggs.get(cid)
    const name = p?.name ?? c?.name ?? cid

    const pAgg: CampaignRawAgg = p?.agg ?? { impressions: 0, reach: 0, conversations: 0, spend: 0 }
    const cAgg: CampaignRawAgg = c?.agg ?? { impressions: 0, reach: 0, conversations: 0, spend: 0 }

    primTotalAgg.impressions += pAgg.impressions
    primTotalAgg.reach += pAgg.reach
    primTotalAgg.conversations += pAgg.conversations
    primTotalAgg.spend += pAgg.spend

    compTotalAgg.impressions += cAgg.impressions
    compTotalAgg.reach += cAgg.reach
    compTotalAgg.conversations += cAgg.conversations
    compTotalAgg.spend += cAgg.spend

    campaignRows.push({
      campaignId: cid,
      campaignName: name,
      primary: toMetrics(pAgg),
      comparison: toMetrics(cAgg),
      conversationDeltaDisplay: formatDelta(pAgg.conversations, cAgg.conversations),
    })
  }

  campaignRows.sort((a, b) => b.primary.conversations - a.primary.conversations || b.primary.spend - a.primary.spend)

  const totals: CampaignComparisonTotals = {
    primary: toMetrics(primTotalAgg),
    comparison: toMetrics(compTotalAgg),
    conversationDeltaDisplay: formatDelta(primTotalAgg.conversations, compTotalAgg.conversations),
  }

  // --- Comparison Cards (item 3.42)
  const convChange = computePercentDelta(prim.summary.conversations, comp.summary.conversations)
  const primCpc = resolve(prim.summary.costPerConversation)
  const compCpc = resolve(comp.summary.costPerConversation)
  const cpcChange = primCpc !== null && compCpc !== null ? computePercentDelta(primCpc, compCpc) : null

  const cards: TotalLeadsComparisonCard[] = [
    {
      label: 'Total conversations (Leads)',
      primaryValue: formatMetricValue(prim.summary.conversations, 'integer'),
      comparisonValue: formatMetricValue(comp.summary.conversations, 'integer'),
      changeDisplay: formatDelta(prim.summary.conversations, comp.summary.conversations),
      isPositive: convChange !== null ? convChange >= 0 : null,
      detail: `Prior period: ${formatMetricValue(comp.summary.conversations, 'integer')}`,
    },
    {
      label: 'Cost / lead (Cost / conv.)',
      primaryValue: formatMetricValue(primCpc, 'currency'),
      comparisonValue: formatMetricValue(compCpc, 'currency'),
      changeDisplay: primCpc !== null && compCpc !== null ? formatDelta(primCpc, compCpc) : '—',
      isPositive: cpcChange !== null ? cpcChange <= 0 : null, // Lower cost is positive
      detail: `Prior period: ${formatMetricValue(compCpc, 'currency')}`,
    },
    {
      label: 'Total ad spend',
      primaryValue: formatMetricValue(prim.summary.spend, 'currency'),
      comparisonValue: formatMetricValue(comp.summary.spend, 'currency'),
      changeDisplay: formatDelta(prim.summary.spend, comp.summary.spend),
      isPositive: null,
      detail: `Prior period: ${formatMetricValue(comp.summary.spend, 'currency')}`,
    },
    {
      label: 'Active campaigns',
      primaryValue: formatMetricValue(primAggs.size, 'integer'),
      comparisonValue: formatMetricValue(compAggs.size, 'integer'),
      changeDisplay: `${primAggs.size} vs ${compAggs.size}`,
      isPositive: null,
      detail: 'Campaigns with activity in period',
    },
  ]

  // --- Grouped Chart Data (item 3.44)
  const chartData: CampaignChartPoint[] = campaignRows.map((c) => ({
    campaignName: c.campaignName,
    primaryConversations: c.primary.conversations,
    comparisonConversations: c.comparison.conversations,
  }))

  const narrativeFlags = composeTabNarrative('meta-ads', { metaAds: primaryResult.data }, narratives)

  return {
    coverage: primaryResult.coverage,
    comparisonCoverage: compResult.coverage,
    hasData: true,
    narrativeFlags,
    primaryRange: range,
    comparisonRange: effectiveComparisonRange,
    isFallbackComparison,
    comparisonLabel,
    cards,
    campaigns: campaignRows,
    totals,
    chartData,
  }
}
