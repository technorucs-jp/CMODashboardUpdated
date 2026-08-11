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
export function useMetricsQuery<T>(
  tab: string,
  range: DateRange,
  comparisonRange: DateRange | null,
  queryFn: () => Promise<T>,
): UseQueryResult<T> {
  const compareSig = comparisonRange ? rangeSignature(comparisonRange) : 'none'
  return useQuery({
    queryKey: ['metrics', tab, rangeSignature(range), compareSig],
    queryFn,
  })
}
