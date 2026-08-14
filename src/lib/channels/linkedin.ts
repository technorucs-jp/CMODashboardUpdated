import { toChannelResult, type ChannelResult, type Coverage } from '../coverage/coverage'
import { containsDate, gapsInRange, type DateRange } from '../time/range'
import { ratio, type Ratio } from '../metrics/ratio'
import { sumMetric } from '../metrics/aggregate'

/** Locally declared, not imported from src/data/schemas.ts (P6 — see metaAds.ts's note). */
export interface LinkedInUpload {
  readonly coversFrom: string
  readonly coversTo: string
}

export interface LinkedInDailyTrend {
  readonly date: string
  readonly newFollowers: number
  readonly pageViews: number
  readonly uniqueVisitors: number
  readonly impressions: number
  readonly clicks: number
  readonly reactions: number
}

export interface LinkedInPost {
  readonly postId: string
  readonly date: string
  readonly title: string
  readonly impressions: number
  readonly clicks: number
  readonly reactions: number
  readonly comments: number
  readonly videoViews: number | null
}

export interface LinkedInCompetitor {
  readonly page: string
  readonly newFollowers: number
  readonly posts: number
  readonly comments: number
  readonly reactions: number
}

export interface LinkedInSeniority {
  readonly level: string
  readonly count: number
}

export interface LinkedInJobFunction {
  readonly function: string
  readonly count: number
}

export interface LinkedInVisitorIndustry {
  readonly industry: string
  readonly count: number
}

export interface LinkedInCompanySize {
  readonly companySize: string
  readonly count: number
}

export interface LinkedInAudience {
  readonly bySeniority: readonly LinkedInSeniority[]
  readonly byJobFunction: readonly LinkedInJobFunction[]
  readonly byVisitorIndustry: readonly LinkedInVisitorIndustry[]
  readonly byCompanySize: readonly LinkedInCompanySize[]
}

export interface LinkedInFileShape {
  readonly meta: { readonly uploads: readonly LinkedInUpload[] }
  readonly dailyTrend: readonly LinkedInDailyTrend[]
  readonly posts: readonly LinkedInPost[]
  readonly competitors?: readonly LinkedInCompetitor[]
  readonly audience?: LinkedInAudience
}

export interface LinkedInSummary {
  readonly newFollowers: number
  readonly pageViews: number
  /** `null` for a multi-day range — LinkedIn de-duplicates visitors itself (P1/TAD §9.2). */
  readonly uniqueVisitors: number | null
  readonly impressions: number
  readonly clicks: number
  readonly reactions: number
  readonly comments: number
  readonly postsPublished: number
  readonly reactionsPerPost: Ratio
  /** (clicks + reactions + comments) / impressions — confirmed against the fixture while building item 1.20. */
  readonly engagementRate: Ratio
}

export interface LinkedInQueryResult {
  readonly dailyTrend: readonly LinkedInDailyTrend[]
  readonly posts: readonly LinkedInPost[]
  readonly competitors: readonly LinkedInCompetitor[]
  readonly audience: LinkedInAudience | null
  readonly summary: LinkedInSummary
}

/**
 * BRD §4.2's deliberate exception (TAD §9.4): a range is servable only if it
 * falls entirely within the union of `meta.uploads[]` intervals. Partial
 * overlap is a hard warning state (`requires-full-coverage`), never a silent
 * clip — a partially-covered follower count is indistinguishable from a bad month.
 */
export function computeLinkedInCoverage(range: DateRange, uploads: readonly LinkedInUpload[]): Coverage {
  const intervals = uploads.map((u) => ({ from: u.coversFrom, to: u.coversTo }))
  const gaps = gapsInRange(range, intervals)
  return gaps.length === 0 ? { kind: 'full' } : { kind: 'requires-full-coverage', gaps }
}

export function queryLinkedIn(file: LinkedInFileShape, range: DateRange): ChannelResult<LinkedInQueryResult> {
  const coverage = computeLinkedInCoverage(range, file.meta.uploads)

  return toChannelResult(coverage, () => {
    const dailyTrend = file.dailyTrend.filter((d) => containsDate(range, d.date))
    const posts = file.posts.filter((p) => containsDate(range, p.date))

    const newFollowers = sumMetric(
      'linkedin.newFollowers',
      dailyTrend.map((d) => ({ date: d.date, value: d.newFollowers })),
    )
    const pageViews = sumMetric(
      'linkedin.pageViews',
      dailyTrend.map((d) => ({ date: d.date, value: d.pageViews })),
    )
    const impressions = sumMetric(
      'linkedin.impressions',
      dailyTrend.map((d) => ({ date: d.date, value: d.impressions })),
    )
    const clicks = sumMetric(
      'linkedin.clicks',
      dailyTrend.map((d) => ({ date: d.date, value: d.clicks })),
    )
    const reactions = sumMetric(
      'linkedin.reactions',
      dailyTrend.map((d) => ({ date: d.date, value: d.reactions })),
    )
    const comments = posts.reduce((total, p) => total + p.comments, 0)

    let uniqueVisitors: number | null
    try {
      uniqueVisitors = sumMetric(
        'linkedin.uniqueVisitors',
        dailyTrend.map((d) => ({ date: d.date, value: d.uniqueVisitors })),
      )
    } catch {
      uniqueVisitors = null
    }

    return {
      dailyTrend,
      posts,
      competitors: file.competitors ?? [],
      audience: file.audience ?? null,
      summary: {
        newFollowers,
        pageViews,
        uniqueVisitors,
        impressions,
        clicks,
        reactions,
        comments,
        postsPublished: posts.length,
        reactionsPerPost: ratio(reactions, posts.length),
        engagementRate: ratio(clicks + reactions + comments, impressions),
      },
    }
  })
}

/** Competitor comparison (BRD §11.2, item 3.37) — not range-filtered; `competitors[]`
 *  carries the comparison period's own totals as reported by the CMO's upload. */
export function competitorReactionsPerPost(competitor: LinkedInCompetitor): Ratio {
  return ratio(competitor.reactions, competitor.posts)
}
