import { registry, type MetricId } from './registry'

export interface DatedValue {
  readonly date: string
  readonly value: number
}

/**
 * Sums a metric's values across rows. Additive metrics sum unconditionally.
 * Non-additive metrics (`reach`, `totalUsers` — de-duplicated by the source
 * platform, TAD §9.2) throw if the rows span more than one distinct date,
 * since summing them across days over-counts people seen more than once.
 * Exactly one date's worth of rows is fine to sum (there's nothing to
 * double-count within the single day the platform already de-duplicated).
 */
export function sumMetric(metricId: MetricId, rows: readonly DatedValue[]): number {
  const definition = registry[metricId]
  const distinctDates = new Set(rows.map((r) => r.date))

  if (!definition.additive && distinctDates.size > 1) {
    throw new Error(
      `sumMetric: '${metricId}' is non-additive (TAD §9.2) — refusing to sum across ${distinctDates.size} distinct days. ` +
        `Use the platform-reported figure for a single day, or render "n/a for multi-day ranges".`,
    )
  }

  return rows.reduce((total, r) => total + r.value, 0)
}
