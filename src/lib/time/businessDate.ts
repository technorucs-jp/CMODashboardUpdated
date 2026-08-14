import { TZDate } from '@date-fns/tz'
import { format } from 'date-fns'

/**
 * The one clock (P5, TAD §9.3): everything in this codebase that needs "what day is
 * this" goes through `toBusinessDate`. `new Date(...)`/`Date.parse(...)` are
 * lint-banned everywhere except this directory (see eslint.config.js).
 *
 * Why `@date-fns/tz`'s `TZDate` rather than hand-rolled offset arithmetic: this app
 * runs entirely in the CMO's browser (TAD §0, ADR-011) — there is no server whose
 * timezone we control. Plain `date-fns` functions read a `Date`'s *local* getters,
 * which reflect whatever timezone the browser's host OS happens to be set to. A
 * `TZDate` overrides those getters to always reflect Asia/Kolkata, so every
 * downstream date-fns call (here and in range.ts/presets.ts) is correct regardless
 * of the machine it runs on — verified directly: a UTC-midnight input and an
 * explicit `+05:30` input both resolve to the same IST calendar day.
 */

export const IST_TIME_ZONE = 'Asia/Kolkata'

/** 'YYYY-MM-DD', always the Asia/Kolkata calendar day. */
export type BusinessDate = string

export function toBusinessDate(input: string | Date): BusinessDate {
  // TZDate's constructor is overloaded per-type (string | Date | number, each
  // separately) rather than accepting a union — branching lets TS's narrowing
  // pick the matching overload instead of trying to match the union as a whole.
  const tzDate = typeof input === 'string' ? new TZDate(input, IST_TIME_ZONE) : new TZDate(input, IST_TIME_ZONE)
  if (Number.isNaN(tzDate.getTime())) {
    throw new Error(`toBusinessDate: unparseable date input: ${String(input)}`)
  }
  return format(tzDate, 'yyyy-MM-dd')
}

/** The current instant, expressed as an Asia/Kolkata-anchored Date for use with date-fns. */
export function nowInIst(): TZDate {
  return TZDate.tz(IST_TIME_ZONE)
}

/**
 * Calendar-widget boundary (item 2.1) — deliberately distinct from `toBusinessDate`.
 *
 * `react-day-picker`'s `Date` objects have no IST awareness: the library reads a
 * `Date`'s *local* getters (whatever timezone the viewer's OS happens to be set
 * to) to decide which calendar cell it represents. A calendar click carries no
 * "instant" to convert — "the 15th" isn't a moment in time, it's a cell — so
 * running it through `toBusinessDate`'s IST-shift logic would be wrong: for a
 * viewer west of India that shift can land on the *previous* day, silently
 * moving their click by one.
 *
 * The correct conversion at this one boundary is a naive extraction of the
 * `Date`'s own local Y/M/D fields, with no shifting at all — the picker already
 * put the user on the calendar cell they clicked; this just reads which one.
 */
export function businessDateFromCalendarDate(date: Date): BusinessDate {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The inverse of `businessDateFromCalendarDate` — constructs a `Date` via the
 * local-timezone constructor (not a UTC/ISO string parse) so its local Y/M/D
 * getters — which is what `react-day-picker` and its own DateLib read — match
 * the given business date's digits exactly, regardless of the viewer's system
 * timezone. Feeds the picker's `selected` prop; never used for anything that
 * needs true IST semantics (use `toBusinessDate`/`nowInIst` for that).
 */
export function calendarDateFromBusinessDate(date: BusinessDate): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Parse an ISO timestamp string to epoch milliseconds using TZDate. */
export function parseTimestampMs(isoString: string): number {
  const tzDate = new TZDate(isoString, IST_TIME_ZONE)
  return tzDate.getTime()
}

/** Calculate elapsed hours from an ISO timestamp to nowInIst() or reference instant. */
export function hoursSince(isoString: string, referenceInstant?: TZDate | Date): number {
  const targetMs = parseTimestampMs(isoString)
  if (isNaN(targetMs)) return NaN
  const nowMs = referenceInstant ? referenceInstant.getTime() : nowInIst().getTime()
  return Math.max(0, (nowMs - targetMs) / (1000 * 60 * 60))
}

/** Format an ISO timestamp in human-readable Indian Standard Time (IST). */
export function formatIstDateTime(isoString: string): string {
  const tzDate = new TZDate(isoString, IST_TIME_ZONE)
  if (isNaN(tzDate.getTime())) return 'Invalid date'
  return format(tzDate, 'dd MMM yyyy, hh:mm:ss a') + ' IST'
}

