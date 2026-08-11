import type { Delta } from './compare'
import type { MetricId } from './registry'

export type Status = 'leading' | 'good' | 'monitor' | 'action-needed'

export interface TargetBand {
  readonly min?: number
  readonly max?: number
  readonly statusIfMet: Status
}

/** Shape of public/data/config/thresholds.json (BRD Appendix A). Loaded by the
 *  data layer and passed in — src/lib/** stays I/O-free (P6). */
export interface ThresholdsConfig {
  readonly leading: { readonly favourablePct: number }
  readonly good: { readonly withinPct: number }
  readonly monitor: { readonly unfavourablePctMin: number; readonly unfavourablePctMax: number }
  readonly actionNeeded: { readonly unfavourablePctMin: number }
  readonly flatBand: { readonly pct: number }
  readonly targetBands: Readonly<Record<string, TargetBand>>
  readonly floors: Readonly<Record<string, number | null>>
}

/**
 * BRD Appendix A, made concrete. The BRD's own ladder only defines Monitor/Action
 * needed for *unfavourable* movement, leaving favourable movement between the
 * flat band and the literal "+15%" figure undefined. This mirrors the same
 * good/monitor/action-needed magnitude boundaries onto the favourable side
 * instead — any favourable move outside the "good" band is "leading" — which is
 * what the checklist's own worked example (sessions +6% → leading, well under
 * the literal 15%) requires, and reads Appendix A's "+15%" as illustrative
 * rather than a separate hard gate with a dead zone below it.
 *
 * A configured target band (e.g. GA4 engagement rate ≥ 60%) can rescue a metric
 * to 'good' even when its delta alone would read worse — Appendix A's "Good: ...
 * or meeting a defined target band" is an OR, not a fallback only used when the
 * delta is already fine.
 */
export function statusOf(metricId: MetricId, delta: Delta, thresholds: ThresholdsConfig): Status {
  const targetBand = thresholds.targetBands[metricId]
  const meetsTargetBand =
    targetBand !== undefined &&
    delta.current !== null &&
    (targetBand.min === undefined || delta.current >= targetBand.min) &&
    (targetBand.max === undefined || delta.current <= targetBand.max)

  if (meetsTargetBand) {
    return targetBand.statusIfMet
  }

  if (delta.pct === null || delta.favourable === null) {
    // No baseline to compare against, or a polarity-neutral metric — neither
    // "leading" nor "action-needed" is a defensible claim, so default to 'good'
    // rather than fabricate a verdict from nothing.
    return 'good'
  }

  const absPct = Math.abs(delta.pct)

  if (absPct <= thresholds.good.withinPct) {
    return 'good'
  }

  if (delta.favourable) {
    return 'leading'
  }

  return absPct >= thresholds.actionNeeded.unfavourablePctMin ? 'action-needed' : 'monitor'
}
