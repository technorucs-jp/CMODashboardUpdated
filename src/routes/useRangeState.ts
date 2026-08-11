import { useSearchParams } from 'react-router-dom'
import { parseRangeParams } from '@/lib/time/rangeFromParams'
import { todayInIst, type PresetId } from '@/lib/time/presets'
import type { DateRange } from '@/lib/time/range'

const BUSINESS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseComparisonParams(cf: string | null, ct: string | null): DateRange | null {
  if (cf !== null && ct !== null && BUSINESS_DATE_RE.test(cf) && BUSINESS_DATE_RE.test(ct) && cf <= ct) {
    return { from: cf, to: ct }
  }
  return null // comparison is off by default (BRD §4.1) — no fallback range, unlike the primary range
}

export interface RangeState {
  readonly range: DateRange
  readonly comparisonRange: DateRange | null
  readonly today: string
  readonly setRange: (range: DateRange, preset: PresetId) => void
  readonly setComparisonRange: (range: DateRange | null, option: string) => void
}

/**
 * The URL is the single source of truth for range state (TAD §11.3, item 2.3) —
 * this hook is the only place that reads or writes it. `DateRangePicker`/
 * `ComparisonRangePicker` keep no range state of their own, only transient UI
 * state (calendar open/closed); they call back into this hook's setters.
 */
export function useRangeState(): RangeState {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayInIst()

  const range = parseRangeParams({ from: searchParams.get('from'), to: searchParams.get('to') }, today)
  const comparisonRange = parseComparisonParams(searchParams.get('cf'), searchParams.get('ct'))

  function setRange(newRange: DateRange, preset: PresetId) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('from', newRange.from)
      next.set('to', newRange.to)
      next.set('preset', preset)
      return next
    })
  }

  function setComparisonRange(newRange: DateRange | null, option: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newRange) {
        next.set('cf', newRange.from)
        next.set('ct', newRange.to)
        next.set('cpreset', option)
      } else {
        next.delete('cf')
        next.delete('ct')
        next.delete('cpreset')
      }
      return next
    })
  }

  return { range, comparisonRange, today, setRange, setComparisonRange }
}
