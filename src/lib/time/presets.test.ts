import { describe, expect, it } from 'vitest'
import { computePreset } from './presets'

// "Frozen clock" here means computePreset takes `today` as an explicit
// parameter rather than reading the system clock internally (P6 — a function
// that reads the live clock isn't pure; the impure read lives in `todayInIst()`
// instead, exercised separately). Pinning `today` gives the same testable
// guarantee as `vi.useFakeTimers()` without making the core function impure.
const TODAY = '2026-08-10'

describe('computePreset (item 1.12)', () => {
  it('"This Month" on 2026-08-10 returns 2026-08-01..2026-08-10', () => {
    expect(computePreset('this-month', TODAY)).toEqual({ from: '2026-08-01', to: '2026-08-10' })
  })

  it('"Today" returns a single-day range', () => {
    expect(computePreset('today', TODAY)).toEqual({ from: TODAY, to: TODAY })
  })

  it('"Last 7 days" is a 7-day inclusive window ending today', () => {
    expect(computePreset('last-7-days', TODAY)).toEqual({ from: '2026-08-04', to: '2026-08-10' })
  })

  it('"Last 30 days" is a 30-day inclusive window ending today', () => {
    expect(computePreset('last-30-days', TODAY)).toEqual({ from: '2026-07-12', to: '2026-08-10' })
  })

  it('"Last Month" is the full previous calendar month', () => {
    expect(computePreset('last-month', TODAY)).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('"This Quarter" starts at the quarter boundary and runs to today', () => {
    // 2026-08-10 is in Q3 (Jul-Sep)
    expect(computePreset('this-quarter', TODAY)).toEqual({ from: '2026-07-01', to: '2026-08-10' })
  })

  it('"Custom" has no computed range', () => {
    expect(computePreset('custom', TODAY)).toBeNull()
  })
})
