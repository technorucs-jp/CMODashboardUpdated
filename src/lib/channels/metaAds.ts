import { computeCoverage, toChannelResult, type ChannelResult } from '../coverage/coverage'
import { containsDate, type DateRange } from '../time/range'
import { ratio, type Ratio } from '../metrics/ratio'
import { sumMetric } from '../metrics/aggregate'

/**
 * Declared locally rather than imported from `src/data/schemas.ts` — P6 forbids
 * `src/lib/**` depending on the data/I/O layer, even for types only (the ESLint
 * rule doesn't distinguish `import type` from a value import, and the point
 * stands regardless: this module should have zero dependency on how the data
 * got loaded). TypeScript's structural typing means the real `MetaAdsFile` from
 * `data/schemas.ts` satisfies this shape without any explicit link between them.
 */
export interface MetaAdsFact {
  readonly date: string
  readonly adSetId: string
  readonly country: string
  readonly spend: number
  readonly impressions: number
  readonly reach: number
  readonly clicks: number
  readonly conversations: number
}

export interface MetaAdsAdSet {
  readonly adSetId: string
  readonly adSetName: string
  readonly campaignId: string
  readonly campaignName: string
  readonly launchDate: string
  readonly region: string
}

export interface MetaAdsAccountRow {
  readonly date: string
  readonly opportunityScore: number
  readonly recommendations: readonly string[]
}

export interface MetaAdsFileShape {
  readonly meta: { readonly earliestRecordDate: string; readonly latestRecordDate: string }
  readonly dimensions: { readonly adSets: readonly MetaAdsAdSet[] }
  readonly facts: readonly MetaAdsFact[]
  readonly account: readonly MetaAdsAccountRow[]
}

export interface MetaAdsSummary {
  readonly spend: number
  readonly impressions: number
  readonly clicks: number
  readonly conversations: number
  readonly costPerConversation: Ratio
  readonly ctr: Ratio
  readonly cpc: Ratio
  readonly cpm: Ratio
  /** `null` for a multi-day range — reach is non-additive (P1/TAD §9.2), never summed across days. */
  readonly reach: number | null
}

export interface MetaAdsQueryResult {
  /** Fact rows already filtered to the range — the basis for any further breakdown a view model builds. */
  readonly facts: readonly MetaAdsFact[]
  readonly adSets: readonly MetaAdsAdSet[]
  readonly summary: MetaAdsSummary
  /** Account rows filtered to the range (item 2.22's opportunity score panel). */
  readonly accountRows: readonly MetaAdsAccountRow[]
}

export function queryMetaAds(file: MetaAdsFileShape, range: DateRange): ChannelResult<MetaAdsQueryResult> {
  const coverage = computeCoverage(range, file.meta.earliestRecordDate, file.meta.latestRecordDate)

  return toChannelResult(coverage, () => {
    const facts = file.facts.filter((f) => containsDate(range, f.date))

    const spend = sumMetric(
      'meta.spend',
      facts.map((f) => ({ date: f.date, value: f.spend })),
    )
    const impressions = sumMetric(
      'meta.impressions',
      facts.map((f) => ({ date: f.date, value: f.impressions })),
    )
    const clicks = sumMetric(
      'meta.clicks',
      facts.map((f) => ({ date: f.date, value: f.clicks })),
    )
    const conversations = sumMetric(
      'meta.conversations',
      facts.map((f) => ({ date: f.date, value: f.conversations })),
    )

    let reach: number | null
    try {
      reach = sumMetric(
        'meta.reach',
        facts.map((f) => ({ date: f.date, value: f.reach })),
      )
    } catch {
      reach = null // multi-day range — reach can't be honestly summed (item 2.16)
    }

    return {
      facts,
      adSets: file.dimensions.adSets,
      accountRows: file.account.filter((a) => containsDate(range, a.date)),
      summary: {
        spend,
        impressions,
        clicks,
        conversations,
        reach,
        costPerConversation: ratio(spend, conversations),
        ctr: ratio(clicks, impressions),
        cpc: ratio(spend, clicks),
        cpm: ratio(spend * 1000, impressions),
      },
    }
  })
}
