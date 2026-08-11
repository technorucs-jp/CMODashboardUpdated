import type { MetricFormat } from './registry'

/**
 * Pure presentation formatting (P6 — no I/O, framework-agnostic) so every
 * view model formats a given `MetricFormat` identically. `null` always
 * renders as `—` (P4) — a caller should have already decided whether `null`
 * means "no data" or "undefined ratio"; this only renders the symbol.
 *
 * Percent/currency/etc. values are expected in their final display
 * magnitude (e.g. a percent value of `0.68`, not the raw fraction `0.0068`)
 * — converting a `Ratio`'s resolved fraction into that magnitude is the
 * view model's job, not this formatter's.
 */
export function formatMetricValue(value: number | null, format: MetricFormat): string {
  if (value === null) return '—'

  switch (format) {
    case 'currency':
      return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`
    case 'integer':
      return Math.round(value).toLocaleString('en-IN')
    case 'percent':
      return `${value.toFixed(2)}%`
    case 'decimal':
      return value.toFixed(2)
    case 'duration':
      return `${Math.round(value)}s`
    case 'score':
      return `${Math.round(value)}`
    default: {
      const _exhaustive: never = format
      throw new Error(`formatMetricValue: unknown format ${String(_exhaustive)}`)
    }
  }
}
