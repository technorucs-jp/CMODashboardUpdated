import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { rangeSignature, type DateRange } from '@/lib/time/range'

/**
 * Item 2.6 — the shared query-key pattern every tab's view-model hook uses:
 * `['metrics', tab, rangeSig, compareSig]`. Combined with the `QueryClientProvider`'s
 * `staleTime: Infinity` (App.tsx, TAD ADR-014 — a deployment's data never changes
 * underneath a loaded page), an identical key never refetches/recomputes, which is
 * what makes a tab switch a cache hit rather than a re-fetch (item 2.6's own verify)
 * and idle-prefetching the other seven tabs (item 2.7) actually pay off.
 */
/**
 * Item 2.24 — wraps every tab's fetch+aggregate step in `performance.mark`/
 * `measure` so a slow range change is caught by a trend (Vercel Speed Insights,
 * item 5.21), not a CMO complaint (TAD §12.1's original framing, adapted from
 * a server-response budget to a client-CPU one under the pivot — ADR-014).
 * Logs to the console for now; recorded p95 numbers go in CHECKLIST.md's
 * Session state per this item's own instruction.
 */
async function instrumented<T>(tab: string, rangeSig: string, fn: () => Promise<T>): Promise<T> {
  const markPrefix = `metrics:${tab}:${rangeSig}`
  performance.mark(`${markPrefix}:start`)
  try {
    return await fn()
  } finally {
    performance.mark(`${markPrefix}:end`)
    const measure = performance.measure(markPrefix, `${markPrefix}:start`, `${markPrefix}:end`)
    console.debug(`[metrics] ${tab} ${rangeSig}: ${measure.duration.toFixed(1)}ms`)
  }
}

export function useMetricsQuery<T>(
  tab: string,
  range: DateRange,
  comparisonRange: DateRange | null,
  queryFn: () => Promise<T>,
): UseQueryResult<T> {
  const compareSig = comparisonRange ? rangeSignature(comparisonRange) : 'none'
  const rangeSig = rangeSignature(range)
  return useQuery({
    queryKey: ['metrics', tab, rangeSig, compareSig],
    queryFn: () => instrumented(tab, rangeSig, queryFn),
  })
}
