import type { Polarity } from './registry'

/** BRD §5.2's flat band: a change within ±2% renders "≈ flat", not a directional arrow. */
const FLAT_BAND_PCT = 2

export interface Delta {
  readonly current: number | null
  readonly comparison: number | null
  readonly pct: number | null
  readonly direction: 'up' | 'down' | 'flat' | 'undefined'
  /** direction × the metric's registry polarity (TAD ADR-007). null when direction is 'undefined' or the metric is polarity-neutral. */
  readonly favourable: boolean | null
}

/**
 * Computes a Delta for a metric's current vs. comparison value.
 *
 * `pct` is `null` — never `Infinity`, never a misleading `+100%` — when the
 * comparison value is 0 and the current value is not; the UI renders "new"
 * for that case (TAD §9.5). When both are 0, nothing changed: `pct` is 0 and
 * direction is 'flat'.
 */
export function compare(current: number, comparison: number, polarity: Polarity): Delta {
  const pct = comparison === 0 ? (current === 0 ? 0 : null) : ((current - comparison) / comparison) * 100

  const direction: Delta['direction'] =
    pct === null ? 'undefined' : Math.abs(pct) <= FLAT_BAND_PCT ? 'flat' : pct > 0 ? 'up' : 'down'

  const favourable: boolean | null =
    direction === 'undefined'
      ? null
      : direction === 'flat'
        ? true
        : polarity === 'neutral'
          ? null
          : polarity === 'higher-better'
            ? direction === 'up'
            : direction === 'down'

  return { current, comparison, pct, direction, favourable }
}
