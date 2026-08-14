import {
  competitorReactionsPerPost,
  queryLinkedIn,
  type LinkedInAudience,
  type LinkedInFileShape,
} from '@/lib/channels/linkedin'
import type { ChannelResult } from '@/lib/coverage/coverage'
import { formatMetricValue } from '@/lib/metrics/format'
import { ratio, resolve, type Ratio } from '@/lib/metrics/ratio'
import type { DateRange } from '@/lib/time/range'

/**
 * View model for the LinkedIn tab (items 3.35-3.40). BRD §11.
 *
 * Enforces upload-based coverage gate (item 3.36, BRD §16 criterion 5).
 * All rates derived client-side at read time (P1).
 */

export interface LinkedInCard {
  readonly label: string
  readonly value: string
  readonly detail: string
}

export interface LinkedInDailyPoint {
  readonly date: string
  readonly newFollowers: number
  readonly impressions: number
  readonly clicks: number
  readonly reactions: number
  readonly engagementRateDisplay: string
}

export interface PostPerformanceRow {
  readonly postId: string
  readonly date: string
  readonly title: string
  readonly impressions: number
  readonly impressionsDisplay: string
  readonly clicks: number
  readonly clicksDisplay: string
  readonly reactions: number
  readonly reactionsDisplay: string
  readonly comments: number
  readonly commentsDisplay: string
  readonly engagementRateDisplay: string
  readonly ctrDisplay: string
  readonly videoViewsDisplay: string
}

export interface CompetitorRow {
  readonly page: string
  readonly isSelf: boolean
  readonly newFollowers: number
  readonly newFollowersDisplay: string
  readonly posts: number
  readonly postsDisplay: string
  readonly comments: number
  readonly commentsDisplay: string
  readonly reactions: number
  readonly reactionsDisplay: string
  readonly reactionsPerPostDisplay: string
  readonly verdict: 'Leading' | 'Behind' | 'Benchmark'
}

export interface DemographicRow {
  readonly label: string
  readonly count: number
  readonly countDisplay: string
  readonly sharePercent: number
  readonly shareDisplay: string
}

export interface AudienceProfileVm {
  readonly seniority: readonly DemographicRow[]
  readonly jobFunction: readonly DemographicRow[]
  readonly visitorIndustry: readonly DemographicRow[]
  readonly companySize: readonly DemographicRow[]
}

export interface LinkedInCompetitorsConfig {
  readonly competitors: readonly { readonly page: string }[]
}

export interface LinkedInViewModel {
  readonly coverage: ChannelResult<unknown>['coverage']
  readonly hasData: boolean
  readonly overviewCards: readonly LinkedInCard[] | null
  readonly dailyTrends: readonly LinkedInDailyPoint[] | null
  readonly posts: readonly PostPerformanceRow[] | null
  readonly competitorTable: readonly CompetitorRow[] | null
  readonly audience: AudienceProfileVm | null
}

function pct(r: Ratio): string {
  const value = resolve(r)
  return formatMetricValue(value === null ? null : value * 100, 'percent')
}

function buildDemographicRows(
  items: readonly { label: string; count: number }[],
): readonly DemographicRow[] {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  return items.map((item) => {
    const share = total > 0 ? item.count / total : 0
    return {
      label: item.label,
      count: item.count,
      countDisplay: formatMetricValue(item.count, 'integer'),
      sharePercent: share * 100,
      shareDisplay: formatMetricValue(share * 100, 'percent'),
    }
  })
}

export function buildLinkedInViewModel(
  file: LinkedInFileShape,
  range: DateRange,
  _competitorsConfig?: LinkedInCompetitorsConfig,
): LinkedInViewModel {
  const result = queryLinkedIn(file, range)

  if (result.data === null) {
    return {
      coverage: result.coverage,
      hasData: false,
      overviewCards: null,
      dailyTrends: null,
      posts: null,
      competitorTable: null,
      audience: null,
    }
  }

  const { dailyTrend, posts, summary, competitors, audience } = result.data
  const isMultiDay = range.from !== range.to

  // --- Overview cards (item 3.35)
  const overviewCards: LinkedInCard[] = [
    { label: 'New followers', value: formatMetricValue(summary.newFollowers, 'integer'), detail: 'Organic page growth' },
    { label: 'Page views', value: formatMetricValue(summary.pageViews, 'integer'), detail: 'All page visits' },
    {
      label: 'Unique visitors',
      value: isMultiDay || summary.uniqueVisitors === null ? 'n/a for multi-day ranges' : formatMetricValue(summary.uniqueVisitors, 'integer'),
      detail: 'De-duplicated by LinkedIn',
    },
    { label: 'Impressions', value: formatMetricValue(summary.impressions, 'integer'), detail: 'Organic feed visibility' },
    { label: 'Clicks', value: formatMetricValue(summary.clicks, 'integer'), detail: 'Content clicks' },
    { label: 'Reactions', value: formatMetricValue(summary.reactions, 'integer'), detail: 'Likes, applauds, insightful' },
    { label: 'Comments', value: formatMetricValue(summary.comments, 'integer'), detail: 'Post conversations' },
    { label: 'Posts published', value: formatMetricValue(summary.postsPublished, 'integer'), detail: `${formatMetricValue(resolve(summary.reactionsPerPost), 'decimal')} reactions / post` },
  ]

  // --- Daily trends (item 3.38)
  const dailyTrends: LinkedInDailyPoint[] = dailyTrend.map((d) => ({
    date: d.date,
    newFollowers: d.newFollowers,
    impressions: d.impressions,
    clicks: d.clicks,
    reactions: d.reactions,
    engagementRateDisplay: pct(ratio(d.clicks + d.reactions, d.impressions)),
  }))

  // --- Post performance list (item 3.39)
  const postRows: PostPerformanceRow[] = [...posts]
    .map((p) => ({
      postId: p.postId,
      date: p.date,
      title: p.title,
      impressions: p.impressions,
      impressionsDisplay: formatMetricValue(p.impressions, 'integer'),
      clicks: p.clicks,
      clicksDisplay: formatMetricValue(p.clicks, 'integer'),
      reactions: p.reactions,
      reactionsDisplay: formatMetricValue(p.reactions, 'integer'),
      comments: p.comments,
      commentsDisplay: formatMetricValue(p.comments, 'integer'),
      engagementRateDisplay: pct(ratio(p.clicks + p.reactions + p.comments, p.impressions)),
      ctrDisplay: pct(ratio(p.clicks, p.impressions)),
      videoViewsDisplay: p.videoViews !== null ? formatMetricValue(p.videoViews, 'integer') : '—',
    }))
    .sort((a, b) => b.impressions - a.impressions)

  // --- Competitor comparison table (item 3.37)
  const selfReactionsPerPost = resolve(summary.reactionsPerPost) ?? 0
  const selfRow: CompetitorRow = {
    page: 'TechnoRUCS',
    isSelf: true,
    newFollowers: summary.newFollowers,
    newFollowersDisplay: formatMetricValue(summary.newFollowers, 'integer'),
    posts: summary.postsPublished,
    postsDisplay: formatMetricValue(summary.postsPublished, 'integer'),
    comments: summary.comments,
    commentsDisplay: formatMetricValue(summary.comments, 'integer'),
    reactions: summary.reactions,
    reactionsDisplay: formatMetricValue(summary.reactions, 'integer'),
    reactionsPerPostDisplay: formatMetricValue(selfReactionsPerPost, 'decimal'),
    verdict: 'Leading',
  }

  const competitorRows: CompetitorRow[] = competitors.map((c) => {
    const compRate = resolve(competitorReactionsPerPost(c)) ?? 0
    return {
      page: c.page,
      isSelf: false,
      newFollowers: c.newFollowers,
      newFollowersDisplay: formatMetricValue(c.newFollowers, 'integer'),
      posts: c.posts,
      postsDisplay: formatMetricValue(c.posts, 'integer'),
      comments: c.comments,
      commentsDisplay: formatMetricValue(c.comments, 'integer'),
      reactions: c.reactions,
      reactionsDisplay: formatMetricValue(c.reactions, 'integer'),
      reactionsPerPostDisplay: formatMetricValue(compRate, 'decimal'),
      verdict: compRate < selfReactionsPerPost ? 'Behind' : 'Leading',
    }
  })

  const competitorTable: CompetitorRow[] = [selfRow, ...competitorRows]

  // --- Audience demographics (item 3.40)
  const audienceVm: AudienceProfileVm | null = audience
    ? {
        seniority: buildDemographicRows(audience.bySeniority.map((s) => ({ label: s.level, count: s.count }))),
        jobFunction: buildDemographicRows(audience.byJobFunction.map((j) => ({ label: j.function, count: j.count }))),
        visitorIndustry: buildDemographicRows(audience.byVisitorIndustry.map((v) => ({ label: v.industry, count: v.count }))),
        companySize: buildDemographicRows(audience.byCompanySize.map((c) => ({ label: c.companySize, count: c.count }))),
      }
    : null

  return {
    coverage: result.coverage,
    hasData: true,
    overviewCards,
    dailyTrends,
    posts: postRows,
    competitorTable,
    audience: audienceVm,
  }
}
