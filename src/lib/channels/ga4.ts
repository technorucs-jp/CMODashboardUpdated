import { computeCoverage, toChannelResult, type ChannelResult } from '../coverage/coverage'
import { containsDate, type DateRange } from '../time/range'
import { ratio, type Ratio } from '../metrics/ratio'
import { sumMetric } from '../metrics/aggregate'

/** Locally declared, not imported from src/data/schemas.ts (P6 — see metaAds.ts's note). */
export interface Ga4Daily {
  readonly date: string
  readonly totalUsers: number
  readonly sessions: number
  readonly screenPageViews: number
  readonly engagedSessions: number
  readonly bouncedSessions: number
  readonly totalSessionDurationSec: number
}

export interface Ga4Channel {
  readonly date: string
  readonly channelGroup: string
  readonly sessions: number
  readonly engagedSessions: number
  readonly bouncedSessions: number
}

export interface Ga4Country {
  readonly date: string
  readonly country: string
  readonly totalUsers: number
  readonly engagedSessions: number
  readonly bouncedSessions: number
  readonly totalSessionDurationSec: number
}

export interface Ga4Source {
  readonly date: string
  readonly source: string
  readonly channelGroup: string
  readonly sessions: number
  readonly engagedSessions: number
  readonly bouncedSessions: number
}

export interface Ga4Page {
  readonly date: string
  readonly pagePath: string
  readonly screenPageViews: number
  readonly totalUsers: number
  readonly engagedSessions: number
  readonly bouncedSessions: number
  readonly totalSessionDurationSec: number
}

export interface Ga4LandingPage {
  readonly date: string
  readonly landingPage: string
  readonly sessions: number
  readonly engagedSessions: number
  readonly bouncedSessions: number
}

export interface Ga4Device {
  readonly date: string
  readonly device: string
  readonly sessions: number
  readonly engagedSessions: number
}

export interface Ga4Path {
  readonly date: string
  readonly step1: string
  readonly step2: string
  readonly sessions: number
}

export interface Ga4FileShape {
  readonly meta: { readonly earliestRecordDate: string; readonly latestRecordDate: string }
  readonly daily: readonly Ga4Daily[]
  readonly channels: readonly Ga4Channel[]
  readonly countries: readonly Ga4Country[]
  /** Optional so the small hand-built fixtures in existing tests still satisfy this shape. */
  readonly sources?: readonly Ga4Source[]
  readonly pages?: readonly Ga4Page[]
  readonly landingPages?: readonly Ga4LandingPage[]
  readonly devices?: readonly Ga4Device[]
  readonly paths?: readonly Ga4Path[]
}

export interface Ga4Summary {
  /** `null` for a multi-day range — totalUsers is non-additive (P1/TAD §9.2). */
  readonly totalUsers: number | null
  readonly sessions: number
  readonly screenPageViews: number
  readonly engagedSessions: number
  readonly bouncedSessions: number
  readonly totalSessionDurationSec: number
  readonly engagementRate: Ratio
  readonly bounceRate: Ratio
  readonly avgSessionDuration: Ratio
  readonly pagesPerSession: Ratio
  readonly countriesReached: number
}

export interface Ga4QueryResult {
  readonly daily: readonly Ga4Daily[]
  readonly summary: Ga4Summary
  /** Every dimension slice, already filtered to the range — the view model does the
   *  grouping, same division of labour as `queryMetaAds` returning raw `facts`. */
  readonly channels: readonly Ga4Channel[]
  readonly sources: readonly Ga4Source[]
  readonly pages: readonly Ga4Page[]
  readonly landingPages: readonly Ga4LandingPage[]
  readonly countries: readonly Ga4Country[]
  readonly devices: readonly Ga4Device[]
  readonly paths: readonly Ga4Path[]
}

export function queryGa4(file: Ga4FileShape, range: DateRange): ChannelResult<Ga4QueryResult> {
  const coverage = computeCoverage(range, file.meta.earliestRecordDate, file.meta.latestRecordDate)

  return toChannelResult(coverage, () => {
    const daily = file.daily.filter((d) => containsDate(range, d.date))

    const sessions = sumMetric(
      'ga4.sessions',
      daily.map((d) => ({ date: d.date, value: d.sessions })),
    )
    const screenPageViews = sumMetric(
      'ga4.screenPageViews',
      daily.map((d) => ({ date: d.date, value: d.screenPageViews })),
    )
    const engagedSessions = sumMetric(
      'ga4.engagedSessions',
      daily.map((d) => ({ date: d.date, value: d.engagedSessions })),
    )
    const bouncedSessions = daily.reduce((total, d) => total + d.bouncedSessions, 0)
    const totalSessionDurationSec = daily.reduce((total, d) => total + d.totalSessionDurationSec, 0)

    let totalUsers: number | null
    try {
      totalUsers = sumMetric(
        'ga4.totalUsers',
        daily.map((d) => ({ date: d.date, value: d.totalUsers })),
      )
    } catch {
      totalUsers = null // multi-day range — GA4 de-duplicates users, can't be honestly summed
    }

    const countriesReached = new Set(file.countries.filter((c) => containsDate(range, c.date)).map((c) => c.country)).size

    const inRange = <T extends { date: string }>(rows: readonly T[] | undefined): readonly T[] =>
      (rows ?? []).filter((r) => containsDate(range, r.date))

    return {
      daily,
      channels: inRange(file.channels),
      sources: inRange(file.sources),
      pages: inRange(file.pages),
      landingPages: inRange(file.landingPages),
      countries: inRange(file.countries),
      devices: inRange(file.devices),
      paths: inRange(file.paths),
      summary: {
        totalUsers,
        sessions,
        screenPageViews,
        engagedSessions,
        bouncedSessions,
        totalSessionDurationSec,
        engagementRate: ratio(engagedSessions, sessions),
        bounceRate: ratio(bouncedSessions, sessions),
        avgSessionDuration: ratio(totalSessionDurationSec, sessions),
        pagesPerSession: ratio(screenPageViews, sessions),
        countriesReached,
      },
    }
  })
}
