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
  readonly clicks?: number
  readonly impressions?: number
  readonly sumPosition?: number
}

export interface GscCountry {
  readonly date: string
  readonly country: string
  readonly clicks?: number
  readonly impressions?: number
  readonly sumPosition?: number
}

export interface GscQuery {
  readonly date: string
  readonly query: string
  readonly clicks: number
  readonly impressions: number
  readonly sumPosition: number
}

export interface GscFileShape {
  readonly meta: { readonly earliestRecordDate: string; readonly latestRecordDate: string }
  readonly daily: readonly GscDaily[]
  readonly devices: readonly GscDevice[]
  readonly pages: readonly GscPage[]
  readonly countries: readonly GscCountry[]
  /** Optional so existing hand-built test fixtures without a queries[] slice still satisfy this shape. */
  readonly queries?: readonly GscQuery[]
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
  /**
   * Brand vs. non-brand (BRD §9.1/§9.2, item 3.28) — computed from `queries[]`
   * filtered to the range, classified against a caller-supplied brand-term list
   * from `config/brand-terms.json` (P6: config passed in, this module stays
   * I/O-free — same pattern as `status.ts`'s `thresholds` parameter). Editing
   * that file changes the split with no re-sync and no code change, since
   * classification happens here at render time, not at ingestion.
   *
   * `queries[]` is an independent, possibly-partial breakdown (GSC's top-N-per-day
   * cap, TAD §7.3) — it is not expected to sum to `clicks` above, so
   * `brandClickShare` is deliberately computed against the authoritative `clicks`
   * total (from `daily[]`), while `nonBrandClicks` is the absolute count actually
   * observed in the (partial) query breakdown, not a `clicks − brandClicks`
   * subtraction that would silently attribute every un-surfaced long-tail query
   * to "non-brand".
   */
  readonly brandClickShare: Ratio
  readonly nonBrandClicks: number
}

export interface GscQueryResult {
  readonly daily: readonly GscDaily[]
  readonly summary: GscSummary
  readonly queries: readonly GscQuery[]
  readonly pages: readonly GscPage[]
  readonly countries: readonly GscCountry[]
  readonly devices: readonly GscDevice[]
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

/** Substring match against a lowercased brand-term list (BRD §9.1's "technorucs" +
 *  misspellings config) — catches "technorucs private limited" via the "technorucs"
 *  term without needing every real-world phrasing enumerated in the config. */
export function isBrandQuery(query: string, brandTerms: readonly string[]): boolean {
  const lower = query.toLowerCase()
  return brandTerms.some((term) => lower.includes(term.toLowerCase()))
}

export function queryGsc(
  file: GscFileShape,
  range: DateRange,
  brandTerms: readonly string[] = [],
): ChannelResult<GscQueryResult> {
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

    const inRange = <T extends { date: string }>(rows: readonly T[] | undefined): readonly T[] =>
      (rows ?? []).filter((r) => containsDate(range, r.date))

    const pagesInRange = inRange(file.pages)
    const countriesInRange = inRange(file.countries)
    const indexedPages = new Set(pagesInRange.map((p) => p.page)).size
    const countriesReached = new Set(countriesInRange.map((c) => c.country)).size

    const queriesInRange = inRange(file.queries)
    const brandClicks = queriesInRange
      .filter((q) => isBrandQuery(q.query, brandTerms))
      .reduce((total, q) => total + q.clicks, 0)
    const nonBrandClicks = queriesInRange
      .filter((q) => !isBrandQuery(q.query, brandTerms))
      .reduce((total, q) => total + q.clicks, 0)

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
        brandClickShare: ratio(brandClicks, clicks),
        nonBrandClicks,
      },
      queries: queriesInRange,
      pages: pagesInRange,
      countries: countriesInRange,
      devices: devicesInRange,
    }
  })
}
