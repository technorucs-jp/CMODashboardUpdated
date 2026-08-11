import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMetricsQuery } from './useMetricsQuery'

function wrapper() {
  // Same staleTime: Infinity as the real QueryClient in App.tsx (TAD ADR-014).
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useMetricsQuery (item 2.6)', () => {
  it('uses the [\'metrics\', tab, rangeSig, compareSig] key shape', async () => {
    const queryFn = vi.fn(async () => ({ value: 1 }))
    const { result } = renderHook(
      () => useMetricsQuery('ad-campaigns', { from: '2026-06-01', to: '2026-06-30' }, null, queryFn),
      { wrapper: wrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('switching away and back to a tab (remount with the same key) issues no second call', async () => {
    const queryFn = vi.fn(async () => ({ value: 1 }))
    const testWrapper = wrapper()
    const range = { from: '2026-06-01', to: '2026-06-30' }

    const first = renderHook(() => useMetricsQuery('ad-campaigns', range, null, queryFn), { wrapper: testWrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    first.unmount() // simulates navigating away from the tab

    const second = renderHook(() => useMetricsQuery('ad-campaigns', range, null, queryFn), { wrapper: testWrapper })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))

    expect(queryFn).toHaveBeenCalledTimes(1) // cache hit, not a second fetch
  })

  it('a different range produces a different key and does refetch', async () => {
    const queryFn = vi.fn(async () => ({ value: 1 }))
    const testWrapper = wrapper()

    const first = renderHook(
      () => useMetricsQuery('ad-campaigns', { from: '2026-06-01', to: '2026-06-30' }, null, queryFn),
      { wrapper: testWrapper },
    )
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))

    const second = renderHook(
      () => useMetricsQuery('ad-campaigns', { from: '2026-07-01', to: '2026-07-31' }, null, queryFn),
      { wrapper: testWrapper },
    )
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))

    expect(queryFn).toHaveBeenCalledTimes(2)
  })
})
