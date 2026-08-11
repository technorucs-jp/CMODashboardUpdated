import { endOfMonth, startOfMonth, startOfQuarter, subDays, subMonths } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { IST_TIME_ZONE, nowInIst, toBusinessDate, type BusinessDate } from './businessDate'
import type { DateRange } from './range'

/** The one place that reads the live clock for presets — deliberately outside
 *  `computePreset` below, which stays pure (P6, TAD §9.3) by taking `today` as
 *  an explicit parameter instead. Callers use this once per render/request. */
export function todayInIst(): BusinessDate {
  return toBusinessDate(nowInIst())
}

/** BRD §4.1's seven presets. */
export type PresetId = 'today' | 'last-7-days' | 'last-30-days' | 'this-month' | 'last-month' | 'this-quarter' | 'custom'

function anchor(date: BusinessDate): TZDate {
  return new TZDate(`${date}T00:00:00`, IST_TIME_ZONE)
}

/**
 * Computes a preset's range given "today" as an explicit IST business date —
 * injected rather than read from the system clock inside this function, so
 * tests pin it directly instead of mocking global time (BRD §4.1: "computed
 * against IST 'today', not the browser clock" — the caller is responsible for
 * deriving `today` via `toBusinessDate(nowInIst())` exactly once).
 *
 * Returns `null` for 'custom' — there is no computed range; the user picks one
 * directly via the calendar.
 */
export function computePreset(preset: PresetId, today: BusinessDate): DateRange | null {
  const t = anchor(today)
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'last-7-days':
      return { from: toBusinessDate(subDays(t, 6)), to: today }
    case 'last-30-days':
      return { from: toBusinessDate(subDays(t, 29)), to: today }
    case 'this-month':
      return { from: toBusinessDate(startOfMonth(t)), to: today }
    case 'last-month': {
      const lastMonth = subMonths(t, 1)
      return { from: toBusinessDate(startOfMonth(lastMonth)), to: toBusinessDate(endOfMonth(lastMonth)) }
    }
    case 'this-quarter':
      return { from: toBusinessDate(startOfQuarter(t)), to: today }
    case 'custom':
      return null
    default: {
      const _exhaustive: never = preset
      throw new Error(`computePreset: unknown preset ${String(_exhaustive)}`)
    }
  }
}
