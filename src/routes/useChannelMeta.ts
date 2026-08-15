import { useQuery } from '@tanstack/react-query'
import { load, type ChannelName } from '@/data/loader'
import type { ChannelFileMetaEnvelope } from '@/data/health'

/**
 * Supplies a channel file's `meta` envelope to the `LastSyncedBadge` (items
 * 5.13/5.14).
 *
 * This exists because the badge was being rendered as `<LastSyncedBadge
 * channel="meta-ads" />` on every tab — with no envelope at all, so
 * `computeSyncHealth` saw `undefined` and every badge in the running app
 * reported "Never synced" in red, regardless of how fresh the data was. The
 * badge's own unit tests passed throughout because they inject an envelope
 * directly; nothing exercised the wiring, which is exactly the gap this closes.
 *
 * Fetching here rather than inside the badge keeps the component free of I/O
 * (TAD §11.1). It is not an extra network call: `load()` memoises per channel
 * for the page's lifetime (item 1.21), so this joins the same promise the tab's
 * own view-model query already triggered.
 */
export function useChannelMeta(channel: ChannelName): ChannelFileMetaEnvelope | null {
  const { data } = useQuery({
    queryKey: ['channel-meta', channel],
    queryFn: async (): Promise<ChannelFileMetaEnvelope> => (await load(channel)) as ChannelFileMetaEnvelope,
    staleTime: Infinity,
  })

  return data ?? null
}
