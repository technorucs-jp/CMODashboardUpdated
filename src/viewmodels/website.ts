import { composeTabNarrative, type NarrativesMap } from '@/lib/narrative/compose'
import type { NarrativeRenderResult } from '@/lib/narrative/renderer'
import { queryMetaAds, type MetaAdsFileShape } from '@/lib/channels/metaAds'
import {
  queryGa4,
  type Ga4Country,
  type Ga4Device,
  type Ga4FileShape,
  type Ga4LandingPage,
  type Ga4Page,
  type Ga4Source,
} from '@/lib/channels/ga4'
import type { ChannelResult } from '@/lib/coverage/coverage'
import { formatMetricValue } from '@/lib/metrics/format'
import { ratio, resolve, type Ratio } from '@/lib/metrics/ratio'
import type { DateRange } from '@/lib/time/range'

/**
 * Composes the Website tab's view model (items 3.17-3.25). BRD §8.
 *
 * **`totalUsers` is `n/a for multi-day ranges` (items 3.17/3.18), and that is
 * the whole point of item 3.18.** GA4 de-duplicates users, so summing daily
 * figures over-counts anyone who visited twice — the registry marks the metric
 * `additive: false` and `sumMetric` throws rather than let it happen. Item
 * 3.17's worked example ("1,346" total users for June) is a figure only GA4's
 * own API can produce for that exact window; this build has no API access by
 * design (TAD ADR-011), so it cannot be derived from day-granular storage. This
 * is the identical structural limit as Meta's `reach`/`frequency` (item
 * 2.15/2.16), reached for the identical reason, and item 3.18 exists precisely
 * to require the honest "n/a" over a plausible wrong number. A single-day range
 * shows the real figure, because there is nothing to double-count within a day.
 *
 * **Page-type tags are a render-time lookup (item 3.23).** `config/page-types.json`
 * maps a URL prefix to a type; longest prefix wins. GA4 has no notion of page
 * type (BRD §8.3), and doing this at render rather than ingestion means editing
 * the config re-tags every page with no re-sync and no code change.
 */

export interface WebsiteCard {
  readonly label: string
  readonly value: string
  readonly detail: string
}

export interface DailySessionPoint {
  readonly date: string
  readonly sessions: number
}

export interface ChannelRow {
  readonly channelGroup: string
  readonly sessions: number
  readonly sessionsDisplay: string
  readonly sharePercent: number
  readonly shareDisplay: string
  readonly engagementRateDisplay: string
  readonly bounceRateDisplay: string
  readonly engagementRatePercent: number
  readonly bounceRatePercent: number
}

export interface SourceRow {
  readonly source: string
  readonly channelGroup: string
  readonly sessions: number
  readonly sessionsDisplay: string
  readonly engagedDisplay: string
  readonly bounceRateDisplay: string
}

export interface AiReferralSummary {
  readonly sessions: number
  readonly sessionsDisplay: string
  readonly engagementRateDisplay: string
  readonly bounceRateDisplay: string
  /** Site-wide figures for the same range, so the panel can state the comparison. */
  readonly siteEngagementRateDisplay: string
  readonly siteBounceRateDisplay: string
  readonly sources: readonly SourceRow[]
}

export interface PageRow {
  readonly pagePath: string
  readonly pageType: string
  readonly views: number
  readonly viewsDisplay: string
  readonly usersDisplay: string
  readonly engagedDisplay: string
  readonly bounceRateDisplay: string
  readonly avgDurationDisplay: string
}

export interface LandingPageRow {
  readonly landingPage: string
  readonly sessions: number
  readonly sessionsDisplay: string
  readonly sharePercent: number
  readonly bounceRateDisplay: string
}

export interface CountryRow {
  readonly country: string
  readonly users: number
  readonly usersDisplay: string
  readonly bounceRateDisplay: string
  readonly avgDurationDisplay: string
}

export interface DeviceRow {
  readonly device: string
  readonly sessions: number
  readonly sessionsDisplay: string
  readonly engagementRateDisplay: string
  readonly engagedOfSessionsDisplay: string
}

export interface PathRow {
  readonly step1: string
  readonly step2: string
  readonly sessions: number
  readonly sessionsDisplay: string
}

export interface WebsiteViewModel {
  readonly coverage: ChannelResult<unknown>['coverage']
  readonly hasData: boolean
  readonly narrativeFlags: readonly NarrativeRenderResult[]
  readonly overviewCards: readonly WebsiteCard[] | null
  readonly dailySessions: readonly DailySessionPoint[] | null
  readonly channelBreakdown: readonly ChannelRow[] | null
  readonly topSources: readonly SourceRow[] | null
  readonly aiReferral: AiReferralSummary | null
  readonly topPages: readonly PageRow[] | null
  readonly landingPages: readonly LandingPageRow[] | null
  readonly countries: readonly CountryRow[] | null
  readonly devices: readonly DeviceRow[] | null
  readonly paths: readonly PathRow[] | null
}

export interface PageTypeRule {
  readonly prefix: string
  readonly type: string
}

export interface PageTypesConfig {
  readonly rules: readonly PageTypeRule[]
  readonly default: string
}

/** Longest matching prefix wins (item 3.23) — `/solutions/x/` must beat a bare `/`. */
export function pageTypeFor(pagePath: string, config: PageTypesConfig): string {
  const match = [...config.rules]
    .filter((r) => pagePath.startsWith(r.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]
  return match?.type ?? config.default
}

/** GA4's bounce is exactly "not engaged", so a slice carrying engaged + bounced
 *  fully describes its own session count — no separate `sessions` field needed. */
function sessionsOf(row: { engagedSessions: number; bouncedSessions: number }): number {
  return row.engagedSessions + row.bouncedSessions
}

function pct(r: Ratio): string {
  const value = resolve(r)
  return formatMetricValue(value === null ? null : value * 100, 'percent')
}

function sumBy<T>(rows: readonly T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0)
}

function groupSum<T, K extends string>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const row of rows) {
    const k = key(row)
    const bucket = map.get(k)
    if (bucket) bucket.push(row)
    else map.set(k, [row])
  }
  return map
}

const AI_CHANNEL_GROUP = 'AI Assistant'

export function buildWebsiteViewModel(
  file: Ga4FileShape,
  range: DateRange,
  pageTypes: PageTypesConfig,
  metaFile?: MetaAdsFileShape | null,
  narratives?: NarrativesMap | null,
): WebsiteViewModel {
  const result = queryGa4(file, range)

  if (result.data === null) {
    return {
      coverage: result.coverage,
      hasData: false,
      narrativeFlags: [],
      overviewCards: null,
      dailySessions: null,
      channelBreakdown: null,
      topSources: null,
      aiReferral: null,
      topPages: null,
      landingPages: null,
      countries: null,
      devices: null,
      paths: null,
    }
  }

  const { daily, summary, channels, sources, pages, landingPages, countries, devices, paths } = result.data
  const isMultiDay = range.from !== range.to

  // --- Overview cards (items 3.17, 3.18)
  const overviewCards: WebsiteCard[] = [
    {
      label: 'Total users',
      // item 3.18 — never a summed figure across days. `summary.totalUsers` is
      // already null for a multi-day range (the channel module catches the throw).
      value: isMultiDay || summary.totalUsers === null ? 'n/a for multi-day ranges' : formatMetricValue(summary.totalUsers, 'integer'),
      detail: 'Unique visitors — de-duplicated by GA4, not summable across days',
    },
    { label: 'Sessions', value: formatMetricValue(summary.sessions, 'integer'), detail: 'All visits' },
    { label: 'Page views', value: formatMetricValue(summary.screenPageViews, 'integer'), detail: 'Screens + pages' },
    {
      label: 'Engaged sessions',
      value: formatMetricValue(summary.engagedSessions, 'integer'),
      detail: `${pct(summary.engagementRate)} engagement rate`,
    },
    { label: 'Avg. bounce rate', value: pct(summary.bounceRate), detail: 'Account-level' },
    {
      label: 'Avg. session duration',
      value: formatMetricValue(resolve(summary.avgSessionDuration), 'duration'),
      detail: 'Per session',
    },
    {
      label: 'Pages / session',
      value: formatMetricValue(resolve(summary.pagesPerSession), 'decimal'),
      detail: `${formatMetricValue(summary.screenPageViews, 'integer')} ÷ ${formatMetricValue(summary.sessions, 'integer')}`,
    },
    { label: 'Countries reached', value: formatMetricValue(summary.countriesReached, 'integer'), detail: 'Global footprint' },
  ]

  // --- Daily sessions (item 3.19)
  const dailySessions: DailySessionPoint[] = daily.map((d) => ({ date: d.date, sessions: d.sessions }))

  // --- Channel breakdown + quality (item 3.20)
  const channelBreakdown: ChannelRow[] = [...groupSum(channels, (c) => c.channelGroup).entries()]
    .map(([channelGroup, rows]) => {
      const sessions = sumBy(rows, (r) => r.sessions)
      const engaged = sumBy(rows, (r) => r.engagedSessions)
      const bounced = sumBy(rows, (r) => r.bouncedSessions)
      const share = resolve(ratio(sessions, summary.sessions))
      const engagementRate = resolve(ratio(engaged, sessions))
      const bounceRate = resolve(ratio(bounced, sessions))
      return {
        channelGroup,
        sessions,
        sessionsDisplay: formatMetricValue(sessions, 'integer'),
        sharePercent: share === null ? 0 : share * 100,
        shareDisplay: pct(ratio(sessions, summary.sessions)),
        engagementRateDisplay: pct(ratio(engaged, sessions)),
        bounceRateDisplay: pct(ratio(bounced, sessions)),
        engagementRatePercent: engagementRate === null ? 0 : engagementRate * 100,
        bounceRatePercent: bounceRate === null ? 0 : bounceRate * 100,
      }
    })
    .sort((a, b) => b.sessions - a.sessions)

  // --- Top sources (item 3.21)
  const sourceRow = (source: string, rows: readonly Ga4Source[]): SourceRow => {
    const sessions = sumBy(rows, (r) => r.sessions)
    const engaged = sumBy(rows, (r) => r.engagedSessions)
    const bounced = sumBy(rows, (r) => r.bouncedSessions)
    return {
      source,
      channelGroup: rows[0]?.channelGroup ?? '',
      sessions,
      sessionsDisplay: formatMetricValue(sessions, 'integer'),
      engagedDisplay: formatMetricValue(engaged, 'integer'),
      bounceRateDisplay: pct(ratio(bounced, engaged + bounced)),
    }
  }

  const topSources: SourceRow[] = [...groupSum(sources, (s) => s.source).entries()]
    .map(([source, rows]) => sourceRow(source, rows))
    .sort((a, b) => b.sessions - a.sessions)

  // --- AI referral panel (item 3.22)
  const aiSources = sources.filter((s) => s.channelGroup === AI_CHANNEL_GROUP)
  const aiSessions = sumBy(aiSources, (s) => s.sessions)
  const aiEngaged = sumBy(aiSources, (s) => s.engagedSessions)
  const aiBounced = sumBy(aiSources, (s) => s.bouncedSessions)
  const aiReferral: AiReferralSummary = {
    sessions: aiSessions,
    sessionsDisplay: formatMetricValue(aiSessions, 'integer'),
    engagementRateDisplay: pct(ratio(aiEngaged, aiSessions)),
    bounceRateDisplay: pct(ratio(aiBounced, aiSessions)),
    siteEngagementRateDisplay: pct(summary.engagementRate),
    siteBounceRateDisplay: pct(summary.bounceRate),
    sources: [...groupSum(aiSources, (s) => s.source).entries()]
      .map(([source, rows]) => sourceRow(source, rows))
      .sort((a, b) => b.sessions - a.sessions),
  }

  // --- Top pages with page-type tags (item 3.23)
  const topPages: PageRow[] = [...groupSum(pages, (p) => p.pagePath).entries()]
    .map(([pagePath, rows]) => {
      const views = sumBy(rows, (r: Ga4Page) => r.screenPageViews)
      const users = sumBy(rows, (r: Ga4Page) => r.totalUsers)
      const engaged = sumBy(rows, (r: Ga4Page) => r.engagedSessions)
      const bounced = sumBy(rows, (r: Ga4Page) => r.bouncedSessions)
      const duration = sumBy(rows, (r: Ga4Page) => r.totalSessionDurationSec)
      const pageSessions = engaged + bounced
      return {
        pagePath,
        pageType: pageTypeFor(pagePath, pageTypes),
        views,
        viewsDisplay: formatMetricValue(views, 'integer'),
        // Per-page users are a de-duplicated GA4 figure like the account-level one,
        // so this is only summed across the rows of a single page, never across days.
        usersDisplay: formatMetricValue(users, 'integer'),
        engagedDisplay: formatMetricValue(engaged, 'integer'),
        bounceRateDisplay: pct(ratio(bounced, pageSessions)),
        avgDurationDisplay: formatMetricValue(resolve(ratio(duration, pageSessions)), 'duration'),
      }
    })
    .sort((a, b) => b.views - a.views)

  // --- Landing pages, countries, devices (item 3.24)
  const totalLandingSessions = sumBy(landingPages, (l: Ga4LandingPage) => l.sessions)
  const landingPageRows: LandingPageRow[] = [...groupSum(landingPages, (l) => l.landingPage).entries()]
    .map(([landingPage, rows]) => {
      const sessions = sumBy(rows, (r: Ga4LandingPage) => r.sessions)
      const bounced = sumBy(rows, (r: Ga4LandingPage) => r.bouncedSessions)
      const share = resolve(ratio(sessions, totalLandingSessions))
      return {
        landingPage,
        sessions,
        sessionsDisplay: formatMetricValue(sessions, 'integer'),
        sharePercent: share === null ? 0 : share * 100,
        bounceRateDisplay: pct(ratio(bounced, sessions)),
      }
    })
    .sort((a, b) => b.sessions - a.sessions)

  const countryRows: CountryRow[] = [...groupSum(countries, (c) => c.country).entries()]
    .map(([country, rows]) => {
      const users = sumBy(rows, (r: Ga4Country) => r.totalUsers)
      const engaged = sumBy(rows, (r: Ga4Country) => r.engagedSessions)
      const bounced = sumBy(rows, (r: Ga4Country) => r.bouncedSessions)
      const duration = sumBy(rows, (r: Ga4Country) => r.totalSessionDurationSec)
      const countrySessions = engaged + bounced
      return {
        country,
        users,
        usersDisplay: formatMetricValue(users, 'integer'),
        bounceRateDisplay: pct(ratio(bounced, countrySessions)),
        avgDurationDisplay: formatMetricValue(resolve(ratio(duration, countrySessions)), 'duration'),
      }
    })
    .sort((a, b) => b.users - a.users)

  const deviceRows: DeviceRow[] = [...groupSum(devices, (d) => d.device).entries()]
    .map(([device, rows]) => {
      const sessions = sumBy(rows, (r: Ga4Device) => r.sessions)
      const engaged = sumBy(rows, (r: Ga4Device) => r.engagedSessions)
      return {
        device,
        sessions,
        sessionsDisplay: formatMetricValue(sessions, 'integer'),
        engagementRateDisplay: pct(ratio(engaged, sessions)),
        engagedOfSessionsDisplay: `${formatMetricValue(engaged, 'integer')} of ${formatMetricValue(sessions, 'integer')} sessions`,
      }
    })
    .sort((a, b) => b.sessions - a.sessions)

  // --- User journey paths (item 3.25). BRD §8.4 accepts a top-N table as the
  // fallback when GA4's path exploration is sparse; an empty `paths[]` renders an
  // explicit empty state rather than a blank panel (P4).
  const pathRows: PathRow[] = [...paths]
    .map((p) => ({
      step1: p.step1,
      step2: p.step2,
      sessions: p.sessions,
      sessionsDisplay: formatMetricValue(p.sessions, 'integer'),
    }))
    .sort((a, b) => b.sessions - a.sessions)

  void sessionsOf // retained for readers: documents the engaged+bounced identity used above

  const metaResult = metaFile ? queryMetaAds(metaFile, range).data : null
  const narrativeFlags = composeTabNarrative('ga4', { ga4: result.data, metaAds: metaResult }, narratives)

  return {
    coverage: result.coverage,
    hasData: true,
    narrativeFlags,
    overviewCards,
    dailySessions,
    channelBreakdown,
    topSources,
    aiReferral,
    topPages,
    landingPages: landingPageRows,
    countries: countryRows,
    devices: deviceRows,
    paths: pathRows,
  }
}
