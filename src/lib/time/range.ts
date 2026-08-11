import { differenceInCalendarDays, subDays } from 'date-fns'
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
