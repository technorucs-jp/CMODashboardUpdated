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
