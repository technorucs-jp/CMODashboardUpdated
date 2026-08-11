import { addDays, differenceInCalendarDays, subDays, subMonths, subYears } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { IST_TIME_ZONE, toBusinessDate, type BusinessDate } from './businessDate'

/** Inclusive [from, to] range of business dates. TAD §9 (range plumbing feeding the coverage/aggregate layer). */
export interface DateRange {
  readonly from: BusinessDate
  readonly to: BusinessDate
}

/** A BusinessDate has no time-of-day component, so "midnight IST" is the correct anchor for arithmetic. */
function anchor(date: BusinessDate): TZDate {
  return new TZDate(`${date}T00:00:00`, IST_TIME_ZONE)
}

/** Inclusive day count — 1–30 June is 30 days, not 29. */
export function lengthInDays(range: DateRange): number {
  return differenceInCalendarDays(anchor(range.to), anchor(range.from)) + 1
}

/** Lexicographic comparison is correct for 'YYYY-MM-DD' strings — no date parsing needed. */
export function containsDate(range: DateRange, date: BusinessDate): boolean {
  return date >= range.from && date <= range.to
}

/** Canonical cache-key form of a range (TAD §12.1's `rangeSig`). */
export function rangeSignature(range: DateRange): string {
  return `${range.from}_${range.to}`
}

/** The immediately-preceding period of equal length — the default comparison (BRD §9.6/TAD §9.6). */
export function previousPeriodOfEqualLength(range: DateRange): DateRange {
  const length = lengthInDays(range)
  const to = subDays(anchor(range.from), 1)
  const from = subDays(to, length - 1)
  return { from: toBusinessDate(from), to: toBusinessDate(to) }
}

/**
 * Each endpoint shifted back exactly one calendar month (item 2.2 — "previous
 * month", distinct from "previous period": a partial-month range shifts by a
 * month, not by its own length). Note the edge case this implies: `date-fns`'
 * `subMonths` clamps to the target month's real day count, so 1-30 June ->
 * 1-30 May (not 1-31 May) — the 30th of June has no "31st of May" equivalent
 * to shift to. This is the same convention most analytics tools use for
 * same-day-of-month comparisons; it is not "the previous full calendar month"
 * for a range that doesn't start on the 1st.
 */
export function previousMonth(range: DateRange): DateRange {
  return { from: toBusinessDate(subMonths(anchor(range.from), 1)), to: toBusinessDate(subMonths(anchor(range.to), 1)) }
}

/** Same span of days, exactly one calendar year earlier (item 2.2 — "previous year"). */
export function previousYear(range: DateRange): DateRange {
  return { from: toBusinessDate(subYears(anchor(range.from), 1)), to: toBusinessDate(subYears(anchor(range.to), 1)) }
}

/** One business date later — used by interval-merging logic (e.g. LinkedIn's
 *  upload-coverage union, item 1.27) to detect back-to-back intervals with no gap. */
export function nextDay(date: BusinessDate): BusinessDate {
  return toBusinessDate(addDays(anchor(date), 1))
}

/**
 * Merges a set of possibly-overlapping-or-adjacent intervals into the minimal
 * sorted set of disjoint intervals covering the same ground. Adjacent (not just
 * overlapping) intervals merge too — two uploads covering 1-30 Jun and 1-31 Jul
 * back to back leave no real gap between them.
 */
export function mergeIntervals(intervals: readonly DateRange[]): DateRange[] {
  const sorted = [...intervals].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
  const merged: DateRange[] = []
  for (const iv of sorted) {
    const last = merged[merged.length - 1]
    if (last !== undefined && iv.from <= nextDay(last.to)) {
      if (iv.to > last.to) merged[merged.length - 1] = { from: last.from, to: iv.to }
    } else {
      merged.push({ ...iv })
    }
  }
  return merged
}

/**
 * The gaps within `range` not covered by the union of `intervals` — e.g. LinkedIn's
 * "requires-full-coverage" rule (item 1.27) reports these as the missing windows.
 * Returns an empty array when `range` is fully covered.
 */
export function gapsInRange(range: DateRange, intervals: readonly DateRange[]): DateRange[] {
  const merged = mergeIntervals(intervals).filter((iv) => iv.to >= range.from && iv.from <= range.to)
  const gaps: DateRange[] = []
  let cursor = range.from
  for (const iv of merged) {
    if (iv.from > cursor) {
      gaps.push({ from: cursor, to: toBusinessDate(subDays(anchor(iv.from), 1)) })
    }
    if (iv.to >= cursor) {
      cursor = nextDay(iv.to)
    }
    if (cursor > range.to) break
  }
  if (cursor <= range.to) {
    gaps.push({ from: cursor, to: range.to })
  }
  return gaps
}
