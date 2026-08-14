import { composeTabNarrative, type NarrativesMap } from '@/lib/narrative/compose'
import type { NarrativeRenderResult } from '@/lib/narrative/renderer'
import { queryGa4, type Ga4FileShape } from '@/lib/channels/ga4'
import { queryGsc, type GscFileShape } from '@/lib/channels/gsc'
import { queryLinkedIn, type LinkedInFileShape } from '@/lib/channels/linkedin'
import { queryMetaAds, type MetaAdsFileShape } from '@/lib/channels/metaAds'
import { queryZoho, type ZohoCrmFileShape } from '@/lib/channels/zoho'
import { compare, percentagePointDelta } from '@/lib/metrics/compare'
import { formatMetricValue } from '@/lib/metrics/format'
import { resolve } from '@/lib/metrics/ratio'
import { registry, type MetricId } from '@/lib/metrics/registry'
import { statusOf, type Status, type ThresholdsConfig } from '@/lib/metrics/status'
import { lengthInDays, previousPeriodOfEqualLength, type DateRange } from '@/lib/time/range'

/**
 * Composes the Overview tab's view model (items 3.2-3.6) — the first tab that
 * reads all five channels at once and the first that needs a real May-vs-June
 * comparison to mean anything (every other built tab so far, Ad Campaigns, only
 * shows a single period). BRD §5.
 *
 * **LinkedIn's May comparison is a genuine coverage gap, not a bug.** The
 * fixture's `linkedin.json` is deliberately June-only (item 1.27's own
 * reasoning: proving `requires-full-coverage` needs a real gap to prove
 * against). Wireframe/09-overview-comparemom.jpg shows real May LinkedIn
 * numbers because the static pre-pivot build had live API access at
 * assembly time; this build's architecture (TAD ADR-011, no backend, upload-
 * gated LinkedIn per BRD §4.2) structurally cannot fabricate a May figure
 * LinkedIn was never uploaded for. The LinkedIn rows below render an explicit
 * "no May data" state instead of a number — P4, not a shortfall.
 *
 * **The channel-health table's status tags mechanically diverge from the
 * wireframe for two of its five rows, and this is deliberate.** The wireframe
 * shows June's Meta cost/conversation (+115.9% unfavourable) and conversations
 * (−43.3% unfavourable) both tagged "Monitor" — but BRD Appendix A's own
 * thresholds (already built and tested, item 1.18: "cost/conversation +116% →
 * action-needed" is that item's own literal verify example) put both moves
 * well past the 30%-unfavourable action-needed floor. The wireframe was a
 * manually-curated static build (Claude reading numbers and writing a
 * judgement call), not threshold-driven; this tab computes status
 * mechanically, from the same tested engine every other status tag in this
 * codebase uses. Re-deriving a special case to force "Monitor" here would mean
 * either weakening item 1.18's already-tested thresholds or duplicating a
 * second, inconsistent threshold path — both worse than a documented,
 * principled divergence from one screenshot. See TASK.md §9's "wireframe may
 * show a bug" guidance.
 */

export interface KpiCardViewModel {
  readonly label: string
  readonly value: string
  readonly detail: string
  readonly accent: string
}

export interface ChannelHealthRow {
  readonly channel: string
  readonly source: string
  readonly keyMetric: string
  readonly value: string
  readonly changeDisplay: string
  readonly status: Status | null
}

export interface PeriodComparisonRow {
  readonly label: string
  readonly currentDisplay: string
  readonly comparisonDisplay: string
  readonly changeDisplay: string
}

export interface PeriodComparisonBlock {
  readonly title: string
  readonly rows: readonly PeriodComparisonRow[]
}

export interface OverviewViewModel {
  readonly kpiCards: readonly KpiCardViewModel[]
  readonly channelHealth: readonly ChannelHealthRow[]
  /** e.g. "vs. previous 30 days" when comparison is off, or "vs. 1–31 May 2026" when set explicitly (item 3.4). */
  readonly comparisonLabel: string
  readonly periodComparisonBlocks: readonly PeriodComparisonBlock[]
  readonly narrativeFlags: readonly NarrativeRenderResult[]
}

/** "1–30 Jun 2026" style label for an explicit comparison range (item 3.4). */
function formatRangeLabel(range: DateRange): string {
  return `${range.from} – ${range.to}`
}

/**
 * A metric-typed % / pp / flat / new / unavailable delta string (items 3.5, 3.6).
 * `current`/`comparison` are already in display magnitude (e.g. 65.3 for a
 * percent-format metric, not 0.653) — the same convention `formatMetricValue`
 * expects. `null` for either input means that side has no data for its range
 * (coverage gap), rendered as an explicit "no comparison" state rather than a
 * fabricated number (P4).
 */
function formatDelta(current: number | null, comparison: number | null, metricId: MetricId): string {
  if (current === null || comparison === null) return 'no data for one period'

  const definition = registry[metricId]
  const delta = compare(current, comparison, definition.polarity)

  if (delta.direction === 'flat') return '≈ flat'
  if (delta.pct === null) return 'new'

  if (definition.format === 'percent') {
    const pp = percentagePointDelta(current, comparison)
    return `${pp >= 0 ? '+' : ''}${pp.toFixed(1)}pp`
  }

  return `${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(1)}%`
}

function statusForDelta(current: number | null, comparison: number | null, metricId: MetricId, thresholds: ThresholdsConfig): Status | null {
  if (current === null || comparison === null) return null
  const delta = compare(current, comparison, registry[metricId].polarity)
  return statusOf(metricId, delta, thresholds)
}

export interface OverviewSourceFiles {
  readonly metaAds: MetaAdsFileShape
  readonly ga4: Ga4FileShape
  readonly gsc: GscFileShape
  readonly linkedin: LinkedInFileShape
  readonly zoho: ZohoCrmFileShape
}

export function buildOverviewViewModel(
  files: OverviewSourceFiles,
  range: DateRange,
  comparisonRange: DateRange | null,
  thresholds: ThresholdsConfig,
  brandTerms: readonly string[],
  narratives?: NarrativesMap | null,
): OverviewViewModel {
  const isComparisonExplicit = comparisonRange !== null
  const effectiveComparisonRange = comparisonRange ?? previousPeriodOfEqualLength(range)
  const comparisonLabel = isComparisonExplicit
    ? `vs. ${formatRangeLabel(effectiveComparisonRange)}`
    : `vs. previous ${lengthInDays(range)} days`

  const metaCurrent = queryMetaAds(files.metaAds, range)
  const metaComparison = queryMetaAds(files.metaAds, effectiveComparisonRange)
  const ga4Current = queryGa4(files.ga4, range)
  const ga4Comparison = queryGa4(files.ga4, effectiveComparisonRange)
  const gscCurrent = queryGsc(files.gsc, range, brandTerms)
  const gscComparison = queryGsc(files.gsc, effectiveComparisonRange, brandTerms)
  const linkedinCurrent = queryLinkedIn(files.linkedin, range)
  const linkedinComparison = queryLinkedIn(files.linkedin, effectiveComparisonRange)
  const zohoCurrent = queryZoho(files.zoho, range)
  const zohoComparison = queryZoho(files.zoho, effectiveComparisonRange)

  // --- KPI cards (item 3.2) — current period only; each card degrades to "—"
  // independently if its own channel has no data for the range (P4), never
  // blanking the other five cards.
  const metaSpend = metaCurrent.data ? metaCurrent.data.summary.spend : null
  const metaConv = metaCurrent.data ? metaCurrent.data.summary.conversations : null
  const metaCostPerConv = metaCurrent.data ? resolve(metaCurrent.data.summary.costPerConversation) : null
  const metaCampaignCount = metaCurrent.data
    ? new Set(
        metaCurrent.data.facts.map(
          (f) => metaCurrent.data!.adSets.find((a) => a.adSetId === f.adSetId)?.campaignId ?? f.adSetId,
        ),
      ).size
    : null

  const sessions = ga4Current.data ? ga4Current.data.summary.sessions : null
  const engagementRatePct = ga4Current.data ? resolve(ga4Current.data.summary.engagementRate) : null
  const countriesReached = ga4Current.data ? ga4Current.data.summary.countriesReached : null

  const gscClicks = gscCurrent.data ? gscCurrent.data.summary.clicks : null
  const gscImpressions = gscCurrent.data ? gscCurrent.data.summary.impressions : null
  const gscCtrPct = gscCurrent.data ? resolve(gscCurrent.data.summary.ctr) : null

  const newFollowers = linkedinCurrent.data ? linkedinCurrent.data.summary.newFollowers : null
  const linkedinImpressions = linkedinCurrent.data ? linkedinCurrent.data.summary.impressions : null
  const linkedinReactions = linkedinCurrent.data ? linkedinCurrent.data.summary.reactions : null

  const kpiCards: KpiCardViewModel[] = [
    {
      label: 'Ad Spend',
      value: formatMetricValue(metaSpend, 'currency'),
      detail: `Meta · ${formatMetricValue(metaConv, 'integer')} conv · ${formatMetricValue(metaCostPerConv, 'currency')}/conv`,
      accent: 'var(--accent-1)',
    },
    {
      label: 'Total Leads',
      value: formatMetricValue(metaConv, 'integer'),
      detail: `Meta Ads conversations · ${formatMetricValue(metaCostPerConv, 'currency')}/lead`,
      accent: 'var(--accent-3)',
    },
    {
      label: 'Sessions',
      value: formatMetricValue(sessions, 'integer'),
      detail: `GA4 · ${formatMetricValue(engagementRatePct === null ? null : engagementRatePct * 100, 'percent')} engagement · ${formatMetricValue(countriesReached, 'integer')} countries`,
      accent: 'var(--accent-4)',
    },
    {
      label: 'Organic Clicks',
      value: formatMetricValue(gscClicks, 'integer'),
      detail: `GSC · ${formatMetricValue(gscImpressions, 'integer')} impr · ${formatMetricValue(gscCtrPct === null ? null : gscCtrPct * 100, 'percent')} CTR`,
      accent: 'var(--accent-5)',
    },
    {
      label: 'New Followers',
      value: formatMetricValue(newFollowers, 'integer'),
      detail: `LinkedIn · ${formatMetricValue(linkedinImpressions, 'integer')} impr · ${formatMetricValue(linkedinReactions, 'integer')} reactions`,
      accent: 'var(--accent-7)',
    },
    {
      label: 'Meta Conversations',
      value: formatMetricValue(metaConv, 'integer'),
      detail: `${formatMetricValue(metaCampaignCount, 'integer')} campaigns · ${formatMetricValue(metaCostPerConv, 'currency')} avg CPL`,
      accent: 'var(--accent-8)',
    },
  ]

  // --- Channel health table (item 3.3) — fixed 5-row list matching the wireframe's
  // layout (BRD §5.2's 4-channel list, split into Ad Campaigns + Total Leads since
  // both are Meta-sourced but distinct tabs — matches Wireframe/01-overview-june-b.jpg).
  const metaCostPerConvCurrent = metaCurrent.data ? resolve(metaCurrent.data.summary.costPerConversation) : null
  const metaCostPerConvComparison = metaComparison.data ? resolve(metaComparison.data.summary.costPerConversation) : null
  const metaConvCurrent = metaCurrent.data ? metaCurrent.data.summary.conversations : null
  const metaConvComparison = metaComparison.data ? metaComparison.data.summary.conversations : null
  const engagementCurrent = ga4Current.data ? resolve(ga4Current.data.summary.engagementRate) : null
  const engagementComparison = ga4Comparison.data ? resolve(ga4Comparison.data.summary.engagementRate) : null
  const engagementCurrentPct = engagementCurrent === null ? null : engagementCurrent * 100
  const engagementComparisonPct = engagementComparison === null ? null : engagementComparison * 100
  const nonBrandCurrent = gscCurrent.data ? gscCurrent.data.summary.nonBrandClicks : null
  const nonBrandComparison = gscComparison.data ? gscComparison.data.summary.nonBrandClicks : null
  const reactionsPerPostCurrent = linkedinCurrent.data ? resolve(linkedinCurrent.data.summary.reactionsPerPost) : null
  // LinkedIn's comparison period has no data at all when the comparison range falls
  // outside meta.uploads[] (item 1.27) — coverage.kind is 'requires-full-coverage',
  // data is null. There is no honest May reactions/post figure to compute against.
  const reactionsPerPostComparison = linkedinComparison.data ? resolve(linkedinComparison.data.summary.reactionsPerPost) : null

  const channelHealth: ChannelHealthRow[] = [
    {
      channel: 'Ad Campaigns',
      source: 'Meta Ads',
      keyMetric: 'Cost/conversation',
      value: formatMetricValue(metaCostPerConvCurrent, 'currency'),
      changeDisplay: formatDelta(metaCostPerConvCurrent, metaCostPerConvComparison, 'meta.costPerConversation'),
      status: statusForDelta(metaCostPerConvCurrent, metaCostPerConvComparison, 'meta.costPerConversation', thresholds),
    },
    {
      channel: 'Total Leads',
      source: 'Meta Ads',
      keyMetric: 'Conversations',
      value: formatMetricValue(metaConvCurrent, 'integer'),
      changeDisplay: formatDelta(metaConvCurrent, metaConvComparison, 'meta.conversations'),
      status: statusForDelta(metaConvCurrent, metaConvComparison, 'meta.conversations', thresholds),
    },
    {
      channel: 'Website',
      source: 'GA4',
      keyMetric: 'Engagement rate',
      value: formatMetricValue(engagementCurrentPct, 'percent'),
      changeDisplay: formatDelta(engagementCurrentPct, engagementComparisonPct, 'ga4.engagementRate'),
      status: statusForDelta(engagementCurrentPct, engagementComparisonPct, 'ga4.engagementRate', thresholds),
    },
    {
      channel: 'SEO',
      source: 'GSC',
      keyMetric: 'Non-brand clicks',
      value: formatMetricValue(nonBrandCurrent, 'integer'),
      changeDisplay: formatDelta(nonBrandCurrent, nonBrandComparison, 'gsc.nonBrandClicks'),
      status: statusForDelta(nonBrandCurrent, nonBrandComparison, 'gsc.nonBrandClicks', thresholds),
    },
    {
      channel: 'LinkedIn',
      source: 'Page',
      keyMetric: 'Reactions/post avg',
      value: formatMetricValue(reactionsPerPostCurrent, 'decimal'),
      changeDisplay: formatDelta(reactionsPerPostCurrent, reactionsPerPostComparison, 'linkedin.reactionsPerPost'),
      status: statusForDelta(reactionsPerPostCurrent, reactionsPerPostComparison, 'linkedin.reactionsPerPost', thresholds),
    },
  ]

  // --- Three period-comparison blocks (item 3.5) — BRD §5.3's exact grouping.
  const metaImpressionsCurrent = metaCurrent.data ? metaCurrent.data.summary.impressions : null
  const metaImpressionsComparison = metaComparison.data ? metaComparison.data.summary.impressions : null
  const metaCpmCurrent = metaCurrent.data ? resolve(metaCurrent.data.summary.cpm) : null
  const metaCpmComparison = metaComparison.data ? resolve(metaComparison.data.summary.cpm) : null
  const metaSpendCurrent = metaCurrent.data ? metaCurrent.data.summary.spend : null
  const metaSpendComparison = metaComparison.data ? metaComparison.data.summary.spend : null

  const contactRateCurrent = zohoCurrent.data ? resolve(zohoCurrent.data.summary.contactRate) : null
  const contactRateComparison = zohoComparison.data ? resolve(zohoComparison.data.summary.contactRate) : null
  const contactRateCurrentPct = contactRateCurrent === null ? null : contactRateCurrent * 100
  const contactRateComparisonPct = contactRateComparison === null ? null : contactRateComparison * 100
  const sessionsCurrent = ga4Current.data ? ga4Current.data.summary.sessions : null
  const sessionsComparison = ga4Comparison.data ? ga4Comparison.data.summary.sessions : null
  const avgDurationCurrent = ga4Current.data ? resolve(ga4Current.data.summary.avgSessionDuration) : null
  const avgDurationComparison = ga4Comparison.data ? resolve(ga4Comparison.data.summary.avgSessionDuration) : null

  const linkedinNewFollowersCurrent = linkedinCurrent.data ? linkedinCurrent.data.summary.newFollowers : null
  const linkedinNewFollowersComparison = linkedinComparison.data ? linkedinComparison.data.summary.newFollowers : null
  const linkedinReactionsCurrent = linkedinCurrent.data ? linkedinCurrent.data.summary.reactions : null
  const linkedinReactionsComparison = linkedinComparison.data ? linkedinComparison.data.summary.reactions : null
  const gscClicksCurrent = gscCurrent.data ? gscCurrent.data.summary.clicks : null
  const gscClicksComparison = gscComparison.data ? gscComparison.data.summary.clicks : null
  const gscImpressionsCurrent = gscCurrent.data ? gscCurrent.data.summary.impressions : null
  const gscImpressionsComparison = gscComparison.data ? gscComparison.data.summary.impressions : null

  function row(
    label: string,
    metricId: MetricId,
    current: number | null,
    comparison: number | null,
    format: Parameters<typeof formatMetricValue>[1],
  ): PeriodComparisonRow {
    return {
      label,
      currentDisplay: formatMetricValue(current, format),
      comparisonDisplay: formatMetricValue(comparison, format),
      changeDisplay: formatDelta(current, comparison, metricId),
    }
  }

  const periodComparisonBlocks: PeriodComparisonBlock[] = [
    {
      title: 'Meta Ads',
      rows: [
        row('Spend', 'meta.spend', metaSpendCurrent, metaSpendComparison, 'currency'),
        row('Conversations', 'meta.conversations', metaConvCurrent, metaConvComparison, 'integer'),
        row('Cost/conversation', 'meta.costPerConversation', metaCostPerConvCurrent, metaCostPerConvComparison, 'currency'),
        row('Impressions', 'meta.impressions', metaImpressionsCurrent, metaImpressionsComparison, 'integer'),
        row('CPM', 'meta.cpm', metaCpmCurrent, metaCpmComparison, 'currency'),
      ],
    },
    {
      title: 'Leads + Website',
      rows: [
        row('Meta conversations', 'meta.conversations', metaConvCurrent, metaConvComparison, 'integer'),
        row('Contact rate', 'zoho.contactRate', contactRateCurrentPct, contactRateComparisonPct, 'percent'),
        row('Sessions', 'ga4.sessions', sessionsCurrent, sessionsComparison, 'integer'),
        row('Engagement rate', 'ga4.engagementRate', engagementCurrentPct, engagementComparisonPct, 'percent'),
        row('Avg. session duration', 'ga4.avgSessionDuration', avgDurationCurrent, avgDurationComparison, 'duration'),
      ],
    },
    {
      title: 'LinkedIn + SEO',
      rows: [
        row('New followers', 'linkedin.newFollowers', linkedinNewFollowersCurrent, linkedinNewFollowersComparison, 'integer'),
        row('Reactions', 'linkedin.reactions', linkedinReactionsCurrent, linkedinReactionsComparison, 'integer'),
        row('GSC clicks', 'gsc.clicks', gscClicksCurrent, gscClicksComparison, 'integer'),
        row('Non-brand clicks', 'gsc.nonBrandClicks', nonBrandCurrent, nonBrandComparison, 'integer'),
        row('GSC impressions', 'gsc.impressions', gscImpressionsCurrent, gscImpressionsComparison, 'integer'),
      ],
    },
  ]

  const narrativeFlags = composeTabNarrative(
    'overview',
    {
      metaAds: metaCurrent.data,
      ga4: ga4Current.data,
      gsc: gscCurrent.data,
      linkedin: linkedinCurrent.data,
      zoho: zohoCurrent.data,
      channelStatuses: channelHealth
        .filter((h): h is typeof h & { status: NonNullable<typeof h.status> } => h.status !== null)
        .map((h) => ({
          channel: h.channel,
          status: h.status,
          reason: `${h.keyMetric} ${h.changeDisplay}`,
        })),
    },
    narratives,
  )

  return {
    kpiCards,
    channelHealth,
    comparisonLabel,
    periodComparisonBlocks,
    narrativeFlags,
  }
}
