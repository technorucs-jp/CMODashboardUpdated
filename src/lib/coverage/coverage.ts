import type { BusinessDate } from '../time/businessDate'
import type { DateRange } from '../time/range'

/**
 * P4 made structural (TAD §9.4): every channel query returns coverage alongside
 * data, and `data` is `null` for every non-renderable kind — a component
 * physically cannot render a metric without having handled absence.
 *
 * Renderable kinds (data present): 'full', 'partial', 'lagging' — GSC's 2-3 day
 * reporting lag still shows real numbers with a banner, it doesn't block
 * rendering. Non-renderable (data null): 'none', 'requires-full-coverage',
 * 'not-connected' — LinkedIn's partial-overlap rule is the deliberate exception
 * BRD §4.2 calls out: a partially-covered follower count is indistinguishable
 * from a bad month, so it's a hard warning state, not a silent clip like every
 * other channel's 'partial'.
 */
export type Coverage =
  | { readonly kind: 'full' }
  | {
      readonly kind: 'partial'
      readonly available: DateRange
      readonly missingBefore?: BusinessDate
      readonly missingAfter?: BusinessDate
    }
  | { readonly kind: 'none'; readonly earliest: BusinessDate | null; readonly latest: BusinessDate | null }
  | { readonly kind: 'lagging'; readonly dataAsOf: BusinessDate } // GSC
  | { readonly kind: 'requires-full-coverage'; readonly gaps: readonly DateRange[] } // LinkedIn
  | { readonly kind: 'not-connected' } // Email

export interface ChannelResult<T> {
  readonly coverage: Coverage
  readonly data: T | null
}

const RENDERABLE_KINDS = new Set<Coverage['kind']>(['full', 'partial', 'lagging'])

export function isRenderable(coverage: Coverage): boolean {
  return RENDERABLE_KINDS.has(coverage.kind)
}

/** Constructs a `ChannelResult`, nulling `data` mechanically for any non-renderable
 *  coverage kind — a caller cannot attach data to a 'none'/'requires-full-coverage'/
 *  'not-connected' result even by accident. `computeData` is lazy so it's never
 *  called (and never has to handle the absent-data case itself) when it wouldn't be used. */
export function toChannelResult<T>(coverage: Coverage, computeData: () => T): ChannelResult<T> {
  return { coverage, data: isRenderable(coverage) ? computeData() : null }
}

/**
 * The common case — full/partial/none — for a channel whose coverage is fully
 * described by `earliestRecordDate`/`latestRecordDate` (Meta Ads, Zoho, GA4).
 * GSC layers its own 'lagging' state on top; LinkedIn and Email construct their
 * `Coverage` directly since their rules don't reduce to a single earliest/latest pair.
 */
export function computeCoverage(
  range: DateRange,
  earliestRecordDate: BusinessDate | null,
  latestRecordDate: BusinessDate | null,
): Coverage {
  if (earliestRecordDate === null || latestRecordDate === null) {
    return { kind: 'none', earliest: null, latest: null }
  }

  if (range.to < earliestRecordDate || range.from > latestRecordDate) {
    return { kind: 'none', earliest: earliestRecordDate, latest: latestRecordDate }
  }

  const missingBefore = range.from < earliestRecordDate ? earliestRecordDate : undefined
  const missingAfter = range.to > latestRecordDate ? latestRecordDate : undefined

  if (missingBefore === undefined && missingAfter === undefined) {
    return { kind: 'full' }
  }

  return {
    kind: 'partial',
    available: {
      from: missingBefore !== undefined ? earliestRecordDate : range.from,
      to: missingAfter !== undefined ? latestRecordDate : range.to,
    },
    missingBefore,
    missingAfter,
  }
}
