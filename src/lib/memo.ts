/**
 * Item 1.30 — a plain keyed memo the browser session's aggregation step uses,
 * so selecting an already-seen `tab:rangeSig` skips recomputation (TAD §12.1's
 * "repeated identical request skips it", minus the server-only `sha:` prefix —
 * there is no commit SHA available client-side and none is needed, since the
 * memo only needs to survive the current tab, not a redeploy, ADR-014).
 *
 * The actual wiring (view-model composition keyed on `tab:rangeSig`) is Phase 2's
 * job (item 2.6's TanStack Query cache does the same thing at a higher level for
 * whole responses); this is the pure primitive underneath either.
 */
export interface KeyedMemo<T> {
  readonly get: (key: string, compute: () => T) => T
  readonly has: (key: string) => boolean
  readonly clear: () => void
}

export function createKeyedMemo<T>(): KeyedMemo<T> {
  const cache = new Map<string, T>()
  return {
    get(key, compute) {
      if (!cache.has(key)) {
        cache.set(key, compute())
      }
      return cache.get(key) as T
    },
    has(key) {
      return cache.has(key)
    },
    clear() {
      cache.clear()
    },
  }
}
