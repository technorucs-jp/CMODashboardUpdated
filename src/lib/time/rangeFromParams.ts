import { z } from 'zod'
import { computePreset } from './presets'
import type { BusinessDate } from './businessDate'
import type { DateRange } from './range'

/**
 * Pure fallback logic for item 1.29 — the actual `react-router` URL wiring is
 * Phase 2's job (items 2.1-2.8); this is the testable core it will call.
 * BRD §4.1: invalid or missing params fall back to the current calendar month
 * to date, never an error screen.
 */
const businessDatePattern = /^\d{4}-\d{2}-\d{2}$/

const rangeParamsSchema = z.object({
  from: z.string().regex(businessDatePattern).optional(),
  to: z.string().regex(businessDatePattern).optional(),
})

export interface RawRangeParams {
  readonly from?: string | null
  readonly to?: string | null
}

export function parseRangeParams(params: RawRangeParams, today: BusinessDate): DateRange {
  const result = rangeParamsSchema.safeParse({
    from: params.from ?? undefined,
    to: params.to ?? undefined,
  })

  if (result.success && result.data.from !== undefined && result.data.to !== undefined && result.data.from <= result.data.to) {
    return { from: result.data.from, to: result.data.to }
  }

  // Missing, malformed, or inverted (from > to) — fall back rather than error.
  return computePreset('this-month', today) as DateRange
}
