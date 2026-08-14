import type {
  LinkedInFileShape,
  LinkedInDailyTrend,
  LinkedInPost,
  LinkedInSeniority,
  LinkedInJobFunction,
  LinkedInVisitorIndustry,
  LinkedInCompanySize,
} from '../../src/lib/channels/linkedin'

export interface RawVisitorRow {
  readonly Date?: string | Date
  readonly 'Page Views'?: number | string
  readonly 'Unique Visitors'?: number | string
  readonly [key: string]: unknown
}

export interface RawFollowerRow {
  readonly Date?: string | Date
  readonly 'Total Followers'?: number | string
  readonly 'New Followers'?: number | string
  readonly [key: string]: unknown
}

export interface RawContentRow {
  readonly 'Post ID'?: string
  readonly 'Post Date'?: string | Date
  readonly 'Post Title'?: string
  readonly Impressions?: number | string
  readonly Clicks?: number | string
  readonly Reactions?: number | string
  readonly Comments?: number | string
  readonly 'Video Views'?: number | string
  readonly [key: string]: unknown
}

export interface RawDemographicRow {
  readonly Category?: string
  readonly Label?: string
  readonly Count?: number | string
  readonly [key: string]: unknown
}

export interface RawLinkedInSheets {
  readonly visitors?: readonly RawVisitorRow[]
  readonly followers?: readonly RawFollowerRow[]
  readonly content?: readonly RawContentRow[]
  readonly demographics?: readonly RawDemographicRow[]
}

export interface ConversionResult {
  readonly data: Partial<LinkedInFileShape>
  readonly coverage: { readonly from: string; readonly to: string } | null
  readonly warnings: readonly string[]
}

function parseIsoDate(val: unknown): string | null {
  if (!val) return null
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10)
  }
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  return null
}

function toNum(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  if (!val) return 0
  const parsed = Number(String(val).replace(/,/g, '').trim())
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Pure LinkedIn export converter (items 5.8, 5.9; TAD §9.4).
 *
 * PURE: No fs, no network, no global variables.
 * Coverage is derived from min/max dates in the row data, NEVER from filenames (item 5.9).
 */
export function convertLinkedInExport(sheets: RawLinkedInSheets): ConversionResult {
  const warnings: string[] = []
  const allDates: string[] = []

  // 1. Process Daily Trends (Visitors & Followers)
  const dailyMap = new Map<
    string,
    {
      newFollowers: number
      pageViews: number
      uniqueVisitors: number
      impressions: number
      clicks: number
      reactions: number
    }
  >()

  if (sheets.visitors) {
    for (const row of sheets.visitors) {
      const d = parseIsoDate(row.Date)
      if (!d) continue
      allDates.push(d)
      const existing = dailyMap.get(d) ?? {
        newFollowers: 0,
        pageViews: 0,
        uniqueVisitors: 0,
        impressions: 0,
        clicks: 0,
        reactions: 0,
      }
      existing.pageViews += toNum(row['Page Views'])
      existing.uniqueVisitors += toNum(row['Unique Visitors'])
      dailyMap.set(d, existing)
    }
  }

  if (sheets.followers) {
    for (const row of sheets.followers) {
      const d = parseIsoDate(row.Date)
      if (!d) continue
      allDates.push(d)
      const existing = dailyMap.get(d) ?? {
        newFollowers: 0,
        pageViews: 0,
        uniqueVisitors: 0,
        impressions: 0,
        clicks: 0,
        reactions: 0,
      }
      existing.newFollowers += toNum(row['New Followers'])
      dailyMap.set(d, existing)
    }
  }

  // 2. Process Content / Posts
  const posts: LinkedInPost[] = []
  if (sheets.content) {
    for (let i = 0; i < sheets.content.length; i++) {
      const row = sheets.content[i]!
      const d = parseIsoDate(row['Post Date'])
      if (d) allDates.push(d)

      const impressions = toNum(row.Impressions)
      const clicks = toNum(row.Clicks)
      const reactions = toNum(row.Reactions)
      const comments = toNum(row.Comments)
      const videoViews = row['Video Views'] !== undefined ? toNum(row['Video Views']) : null

      if (d) {
        const daily = dailyMap.get(d)
        if (daily) {
          daily.impressions += impressions
          daily.clicks += clicks
          daily.reactions += reactions
        }
      }

      posts.push({
        postId: row['Post ID'] ? String(row['Post ID']) : `post-${i + 1}`,
        date: d ?? '2026-01-01',
        title: row['Post Title'] ? String(row['Post Title']) : `LinkedIn Post ${i + 1}`,
        impressions,
        clicks,
        reactions,
        comments,
        videoViews,
      })
    }
  }

  const dailyTrend: LinkedInDailyTrend[] = Array.from(dailyMap.entries())
    .map(([date, vals]) => ({
      date,
      ...vals,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 3. Process Audience Demographics
  const bySeniority: LinkedInSeniority[] = []
  const byJobFunction: LinkedInJobFunction[] = []
  const byVisitorIndustry: LinkedInVisitorIndustry[] = []
  const byCompanySize: LinkedInCompanySize[] = []

  if (sheets.demographics) {
    for (const row of sheets.demographics) {
      const cat = String(row.Category ?? '').toLowerCase()
      const label = String(row.Label ?? 'Unknown')
      const count = toNum(row.Count)

      if (cat.includes('seniority')) bySeniority.push({ level: label, count })
      else if (cat.includes('job') || cat.includes('function')) byJobFunction.push({ function: label, count })
      else if (cat.includes('industry')) byVisitorIndustry.push({ industry: label, count })
      else if (cat.includes('size') || cat.includes('company')) byCompanySize.push({ companySize: label, count })
    }
  }

  // 4. Determine Min/Max Coverage Dates from Row Data (item 5.9)
  let coverage: { from: string; to: string } | null = null
  if (allDates.length > 0) {
    allDates.sort()
    coverage = {
      from: allDates[0]!,
      to: allDates[allDates.length - 1]!,
    }
  } else {
    warnings.push('No valid dates found in export sheets; coverage could not be derived.')
  }

  return {
    data: {
      dailyTrend,
      posts,
      audience: {
        bySeniority,
        byJobFunction,
        byVisitorIndustry,
        byCompanySize,
      },
    },
    coverage,
    warnings,
  }
}
