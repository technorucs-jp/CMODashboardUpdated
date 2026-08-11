import { computeCoverage, toChannelResult, type ChannelResult, type Coverage } from '../coverage/coverage'
import { containsDate, type DateRange } from '../time/range'
import { ratio, type Ratio } from '../metrics/ratio'
import { sumMetric } from '../metrics/aggregate'

/** Locally declared, not imported from src/data/schemas.ts (P6 — see metaAds.ts's note). */
export interface GscDaily {
  readonly date: string
  readonly clicks: number
  readonly impressions: number
  readonly sumPosition: number
  readonly rows: number
}

export interface GscDevice {
  readonly date: string
  readonly device: string
  readonly clicks: number
  readonly impressions: number
  readonly sumPosition: number
}

export interface GscPage {
  readonly date: string
  readonly page: string
}

export interface GscCountry {
  readonly date: string
  readonly country: string
}

export interface GscFileShape {
  readonly meta: { readonly earliestRecordDate: string; readonly latestRecordDate: string }
  readonly daily: readonly GscDaily[]
  readonly devices: readonly GscDevice[]
  readonly pages: readonly GscPage[]
  readonly countries: readonly GscCountry[]
}

export interface GscSummary {
  readonly clicks: number
  readonly impressions: number
  readonly ctr: Ratio
  /** Impression-weighted: Σ sumPosition ÷ Σ impressions (P1 — never the mean of daily averages). */
  readonly avgPosition: Ratio
  readonly mobileClickShare: Ratio
  readonly indexedPages: number
  readonly countriesReached: number
}

export interface GscQueryResult {
  readonly daily: readonly GscDaily[]
  readonly summary: GscSummary
}

/**
 * GSC always carries a 2-3 day reporting lag from Google's side (BRD §9, TAD
 * §7.2) — whenever the base coverage would be 'full', this wraps it as
 * 'lagging' so the `DataAsOfBanner` (item 3.29) always has something to key
 * off. 'partial'/'none' already carry a stronger signal and pass through unchanged.
 */
function gscCoverage(range: DateRange, earliestRecordDate: string, latestRecordDate: string): Coverage {
  const base = computeCoverage(range, earliestRecordDate, latestRecordDate)
  return base.kind === 'full' ? { kind: 'lagging', dataAsOf: latestRecordDate } : base
}

export function queryGsc(file: GscFileShape, range: DateRange): ChannelResult<GscQueryResult> {
  const coverage = gscCoverage(range, file.meta.earliestRecordDate, file.meta.latestRecordDate)

  return toChannelResult(coverage, () => {
    const daily = file.daily.filter((d) => containsDate(range, d.date))

    const clicks = sumMetric(
      'gsc.clicks',
      daily.map((d) => ({ date: d.date, value: d.clicks })),
    )
    const impressions = sumMetric(
      'gsc.impressions',
      daily.map((d) => ({ date: d.date, value: d.impressions })),
    )
    const sumPosition = daily.reduce((total, d) => total + d.sumPosition, 0)

    const devicesInRange = file.devices.filter((d) => containsDate(range, d.date))
    const mobileClicks = devicesInRange.filter((d) => d.device === 'MOBILE').reduce((total, d) => total + d.clicks, 0)

    const indexedPages = new Set(file.pages.filter((p) => containsDate(range, p.date)).map((p) => p.page)).size
    const countriesReached = new Set(file.countries.filter((c) => containsDate(range, c.date)).map((c) => c.country)).size

    return {
      daily,
      summary: {
        clicks,
        impressions,
        ctr: ratio(clicks, impressions),
        avgPosition: ratio(sumPosition, impressions),
        mobileClickShare: ratio(mobileClicks, clicks),
        indexedPages,
        countriesReached,
      },
    }
  })
}
