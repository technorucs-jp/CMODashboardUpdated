import { describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useRangeState } from './useRangeState'

function wrapper(initialEntry: string) {
  return ({ children }: { children: React.ReactNode }) => <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
}

describe('useRangeState (item 2.3)', () => {
  it('with no query params, falls back to the current month to date', () => {
    const { result } = renderHook(() => useRangeState(), { wrapper: wrapper('/leads') })
    // today is whatever the real IST clock says — assert the shape holds (from = 1st of the month, to = today)
    expect(result.current.range.from.endsWith('-01')).toBe(true)
    expect(result.current.range.to).toBe(result.current.today)
  })

  it('parses a well-formed range from the URL', () => {
    const { result } = renderHook(() => useRangeState(), {
      wrapper: wrapper('/leads?from=2026-06-01&to=2026-06-30'),
    })
    expect(result.current.range).toEqual({ from: '2026-06-01', to: '2026-06-30' })
  })

  it('comparison is null/off when cf/ct are absent — no fallback range for comparison', () => {
    const { result } = renderHook(() => useRangeState(), {
      wrapper: wrapper('/leads?from=2026-06-01&to=2026-06-30'),
    })
    expect(result.current.comparisonRange).toBeNull()
  })

  it('parses a well-formed comparison range from cf/ct', () => {
    const { result } = renderHook(() => useRangeState(), {
      wrapper: wrapper('/leads?from=2026-06-01&to=2026-06-30&cf=2026-05-02&ct=2026-05-31'),
    })
    expect(result.current.comparisonRange).toEqual({ from: '2026-05-02', to: '2026-05-31' })
  })

  it('setRange updates from/to/preset in the URL (the only state — no React state duplicate)', () => {
    const { result } = renderHook(() => useRangeState(), { wrapper: wrapper('/leads') })
    act(() => {
      result.current.setRange({ from: '2026-07-01', to: '2026-07-31' }, 'last-month')
    })
    expect(result.current.range).toEqual({ from: '2026-07-01', to: '2026-07-31' })
  })

  it('setComparisonRange(null) clears cf/ct/cpreset', () => {
    const { result } = renderHook(() => useRangeState(), {
      wrapper: wrapper('/leads?from=2026-06-01&to=2026-06-30&cf=2026-05-02&ct=2026-05-31'),
    })
    expect(result.current.comparisonRange).not.toBeNull()
    act(() => {
      result.current.setComparisonRange(null, 'off')
    })
    expect(result.current.comparisonRange).toBeNull()
  })
})
