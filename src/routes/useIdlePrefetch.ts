import { useEffect } from 'react'
import { load, type ChannelName } from '@/data/loader'

const ALL_CHANNELS: readonly ChannelName[] = ['meta-ads', 'zoho-crm', 'ga4', 'gsc', 'linkedin']

/**
 * Item 2.7 — after first paint, prefetch every channel the *other* tabs need
 * (Overview needs all of them; each other tab needs its own one) so a tab
 * switch is a cache hit against `load()`'s own in-memory cache (item 1.21),
 * not a fresh fetch. "Other seven tabs" (BRD §4.1) share only five real
 * channel files + `narratives`, so prefetching every channel once covers
 * every tab, not seven separate prefetches.
 *
 * Best-effort: a prefetch failure is swallowed here — the tab that actually
 * needs that channel will call `load()` itself and surface the real error
 * through its own coverage/error-state handling, not a silent background
 * rejection nobody sees.
 */
export function useIdlePrefetch(currentChannel?: ChannelName): void {
  useEffect(() => {
    const toPrefetch = ALL_CHANNELS.filter((c) => c !== currentChannel)

    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void) => number
      cancelIdleCallback?: (handle: number) => void
    }
    const requestIdle = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1) as unknown as number)
    const cancelIdle = w.cancelIdleCallback ?? ((handle: number) => window.clearTimeout(handle))

    const handle = requestIdle(() => {
      for (const channel of toPrefetch) {
        load(channel).catch(() => {
          // Swallowed deliberately — see doc comment above.
        })
      }
    })

    return () => cancelIdle(handle)
  }, [currentChannel])
}
