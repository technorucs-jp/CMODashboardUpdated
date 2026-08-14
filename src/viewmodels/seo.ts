import { isBrandQuery, queryGsc, type GscCountry, type GscDevice, type GscFileShape, type GscPage, type GscQuery } from '@/lib/channels/gsc'
import type { ChannelResult } from '@/lib/coverage/coverage'
import { formatMetricValue } from '@/lib/metrics/format'
import { ratio, resolve, type Ratio } from '@/lib/metrics/ratio'
import type { DateRange } from '@/lib/time/range'

/**
 * View model for the SEO tab (items 3.26-3.33). BRD §9.
 *
 * All averages are impression-weighted across the range:
 * Avg. Position = Σ sumPosition ÷ Σ impressions (P1).
 * Brand vs. non-brand is determined at render time using `config/brand-terms.json`.
 */

export interface SeoCard {
  readonly label: string
  readonly value: string
  readonly detail: string
}

export interface DailyPoint {
  readonly date: string
  readonly clicks: number
  readonly impressions: number
}

export interface QueryRow {
  readonly query: string
  readonly isBrand: boolean
  readonly typeLabel: 'Brand' | 'Non-brand'
  readonly clicks: number
  readonly clicksDisplay: string
  readonly impressions: number
  readonly impressionsDisplay: string
  readonly ctrDisplay: string
  readonly avgPosition: number
  readonly avgPositionDisplay: string
}

export type ZeroClickPriority = 'Critical' | 'High' | 'Standard'

export interface ZeroClickRow {
  readonly query: string
  readonly impressions: number
  readonly impressionsDisplay: string
  readonly avgPosition: number
  readonly avgPositionDisplay: string
  readonly gapToPage1: number
  readonly gapToPage1Display: string
  readonly priority: ZeroClickPriority
}

export interface PageRow {
  readonly page: string
  readonly clicks: number
  readonly clicksDisplay: string
  readonly impressions: number
  readonly impressionsDisplay: string
  readonly ctrDisplay: string
  readonly avgPositionDisplay: string
}

export interface CountryRow {
  readonly country: string
  readonly clicks: number
  readonly clicksDisplay: string
  readonly impressions: number
  readonly impressionsDisplay: string
  readonly ctrDisplay: string
  readonly avgPositionDisplay: string
}

export interface DeviceRow {
  readonly device: string
  readonly clicks: number
  readonly clicksDisplay: string
  readonly impressions: number
  readonly impressionsDisplay: string
  readonly ctrDisplay: string
  readonly avgPositionDisplay: string
  readonly clickShareDisplay: string
}

export interface SeoViewModel {
  readonly coverage: ChannelResult<unknown>['coverage']
  readonly hasData: boolean
  readonly dataAsOfDate: string
  readonly overviewCards: readonly SeoCard[] | null
  readonly dailyTrend: readonly DailyPoint[] | null
  readonly clickQueries: readonly QueryRow[] | null
  readonly zeroClickQueries: readonly ZeroClickRow[] | null
  readonly topPages: readonly PageRow[] | null
  readonly countries: readonly CountryRow[] | null
  readonly devices: readonly DeviceRow[] | null
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

export function classifyZeroClickPriority(impressions: number, avgPosition: number): ZeroClickPriority {
  if (impressions > 100 && avgPosition > 50) return 'Critical'
  if ((impressions > 50 && avgPosition > 30) || (impressions >= 20 && avgPosition >= 30)) return 'High'
  return 'Standard'
}

export function buildSeoViewModel(
  file: GscFileShape,
  range: DateRange,
  brandTerms: readonly string[] = [],
): SeoViewModel {
  const result = queryGsc(file, range, brandTerms)

  if (result.data === null) {
    return {
      coverage: result.coverage,
      hasData: false,
      dataAsOfDate: file.meta.latestRecordDate,
      overviewCards: null,
      dailyTrend: null,
      clickQueries: null,
      zeroClickQueries: null,
      topPages: null,
      countries: null,
      devices: null,
    }
  }

  const { daily, summary, queries, pages, countries, devices } = result.data

  // --- Overview cards (item 3.26)
  const overviewCards: SeoCard[] = [
    { label: 'Total clicks', value: formatMetricValue(summary.clicks, 'integer'), detail: 'Organic search visits' },
    { label: 'Total impressions', value: formatMetricValue(summary.impressions, 'integer'), detail: 'Search visibility' },
    { label: 'Avg. CTR', value: pct(summary.ctr), detail: `${formatMetricValue(summary.clicks, 'integer')} ÷ ${formatMetricValue(summary.impressions, 'integer')}` },
    {
      label: 'Avg. position',
      value: formatMetricValue(resolve(summary.avgPosition), 'decimal'),
      detail: 'Impression-weighted rank across range',
    },
    { label: 'Indexed pages', value: formatMetricValue(summary.indexedPages, 'integer'), detail: 'Surfacing in search' },
    {
      label: 'Brand click share',
      value: pct(summary.brandClickShare),
      detail: `${formatMetricValue(summary.nonBrandClicks, 'integer')} non-brand clicks observed`,
    },
    { label: 'Countries reached', value: formatMetricValue(summary.countriesReached, 'integer'), detail: 'Global search audience' },
    { label: 'Mobile click share', value: pct(summary.mobileClickShare), detail: 'Of total search clicks' },
  ]

  // --- Daily trend
  const dailyTrend: DailyPoint[] = daily.map((d) => ({
    date: d.date,
    clicks: d.clicks,
    impressions: d.impressions,
  }))

  // --- Queries: click-generating (item 3.30) & zero-click (item 3.31)
  const groupedQueries = [...groupSum(queries, (q) => q.query).entries()].map(([queryText, rows]) => {
    const totalClicks = sumBy(rows, (r: GscQuery) => r.clicks)
    const totalImpressions = sumBy(rows, (r: GscQuery) => r.impressions)
    const totalSumPosition = sumBy(rows, (r: GscQuery) => r.sumPosition)
    const avgPos = totalImpressions > 0 ? totalSumPosition / totalImpressions : 0
    const isBrand = isBrandQuery(queryText, brandTerms)
    return {
      query: queryText,
      isBrand,
      typeLabel: isBrand ? ('Brand' as const) : ('Non-brand' as const),
      clicks: totalClicks,
      clicksDisplay: formatMetricValue(totalClicks, 'integer'),
      impressions: totalImpressions,
      impressionsDisplay: formatMetricValue(totalImpressions, 'integer'),
      ctrDisplay: pct(ratio(totalClicks, totalImpressions)),
      avgPosition: avgPos,
      avgPositionDisplay: formatMetricValue(avgPos, 'decimal'),
    }
  })

  const clickQueries: QueryRow[] = groupedQueries
    .filter((q) => q.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)

  const zeroClickQueries: ZeroClickRow[] = groupedQueries
    .filter((q) => q.clicks === 0)
    .map((q) => {
      const gap = Math.max(0, Math.round((q.avgPosition - 10) * 10) / 10)
      return {
        query: q.query,
        impressions: q.impressions,
        impressionsDisplay: q.impressionsDisplay,
        avgPosition: q.avgPosition,
        avgPositionDisplay: q.avgPositionDisplay,
        gapToPage1: gap,
        gapToPage1Display: gap > 0 ? `+${gap.toFixed(1)}` : 'On Page 1',
        priority: classifyZeroClickPriority(q.impressions, q.avgPosition),
      }
    })
    .sort((a, b) => b.impressions - a.impressions)

  // --- Top pages (item 3.32)
  const topPages: PageRow[] = [...groupSum(pages, (p) => p.page).entries()]
    .map(([pagePath, rows]) => {
      const pageClicks = sumBy(rows, (r: GscPage) => r.clicks ?? 0)
      const pageImpressions = sumBy(rows, (r: GscPage) => r.impressions ?? 0)
      const pageSumPos = sumBy(rows, (r: GscPage) => r.sumPosition ?? 0)
      const avgPos = pageImpressions > 0 ? pageSumPos / pageImpressions : null
      return {
        page: pagePath,
        clicks: pageClicks,
        clicksDisplay: formatMetricValue(pageClicks, 'integer'),
        impressions: pageImpressions,
        impressionsDisplay: formatMetricValue(pageImpressions, 'integer'),
        ctrDisplay: pct(ratio(pageClicks, pageImpressions)),
        avgPositionDisplay: formatMetricValue(avgPos, 'decimal'),
      }
    })
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)

  // --- Countries (item 3.32)
  const countryRows: CountryRow[] = [...groupSum(countries, (c) => c.country).entries()]
    .map(([countryCode, rows]) => {
      const cClicks = sumBy(rows, (r: GscCountry) => r.clicks ?? 0)
      const cImpressions = sumBy(rows, (r: GscCountry) => r.impressions ?? 0)
      const cSumPos = sumBy(rows, (r: GscCountry) => r.sumPosition ?? 0)
      const avgPos = cImpressions > 0 ? cSumPos / cImpressions : null
      return {
        country: countryCode,
        clicks: cClicks,
        clicksDisplay: formatMetricValue(cClicks, 'integer'),
        impressions: cImpressions,
        impressionsDisplay: formatMetricValue(cImpressions, 'integer'),
        ctrDisplay: pct(ratio(cClicks, cImpressions)),
        avgPositionDisplay: formatMetricValue(avgPos, 'decimal'),
      }
    })
    .sort((a, b) => b.clicks - a.clicks)

  // --- Devices (item 3.32)
  const totalDeviceClicks = sumBy(devices, (d: GscDevice) => d.clicks)
  const deviceRows: DeviceRow[] = [...groupSum(devices, (d) => d.device).entries()]
    .map(([devName, rows]) => {
      const dClicks = sumBy(rows, (r: GscDevice) => r.clicks)
      const dImpressions = sumBy(rows, (r: GscDevice) => r.impressions)
      const dSumPos = sumBy(rows, (r: GscDevice) => r.sumPosition)
      const avgPos = dImpressions > 0 ? dSumPos / dImpressions : null
      return {
        device: devName,
        clicks: dClicks,
        clicksDisplay: formatMetricValue(dClicks, 'integer'),
        impressions: dImpressions,
        impressionsDisplay: formatMetricValue(dImpressions, 'integer'),
        ctrDisplay: pct(ratio(dClicks, dImpressions)),
        avgPositionDisplay: formatMetricValue(avgPos, 'decimal'),
        clickShareDisplay: pct(ratio(dClicks, totalDeviceClicks)),
      }
    })
    .sort((a, b) => b.clicks - a.clicks)

  return {
    coverage: result.coverage,
    hasData: true,
    dataAsOfDate: file.meta.latestRecordDate,
    overviewCards,
    dailyTrend,
    clickQueries,
    zeroClickQueries,
    topPages,
    countries: countryRows,
    devices: deviceRows,
  }
}
