import { formatIstDateTime, hoursSince, parseTimestampMs } from '@/lib/time/businessDate'
import type { TZDate } from '@date-fns/tz'

export type SyncHealthLevel = 'fresh' | 'delayed' | 'stale'

export interface ChannelHealthSnapshot {
  readonly channel: string
  readonly lastSyncedAt: string | null
  readonly latestRecordDate: string | null
  readonly rowCountSummary: string
  readonly level: SyncHealthLevel
  readonly isStale: boolean
  readonly ageHours: number | null
  readonly formattedIst: string
}

export interface ChannelFileMetaEnvelope {
  readonly meta?: {
    readonly lastSyncedAt?: string
    readonly latestRecordDate?: string
    readonly rowCounts?: Record<string, number>
    readonly uploads?: readonly { coversFrom: string; coversTo: string }[]
  }
}

// Default cadences in hours:
// Meta: 24h, Zoho: 24h, GA4: 24h, GSC: 48h, LinkedIn: 720h (30 days)
const DEFAULT_CADENCE_HOURS: Record<string, number> = {
  'meta-ads': 24,
  'zoho-crm': 24,
  ga4: 24,
  gsc: 48,
  linkedin: 720,
}

export function formatIstTimestamp(isoDateStr: string | null | undefined): string {
  if (!isoDateStr) return 'Never synced'
  return formatIstDateTime(isoDateStr)
}

export function computeSyncHealth(
  channel: string,
  metaEnvelope: ChannelFileMetaEnvelope | null | undefined,
  referenceInstant?: TZDate | Date,
  customCadences: Record<string, number> = DEFAULT_CADENCE_HOURS,
): ChannelHealthSnapshot {
  const lastSyncedAt = metaEnvelope?.meta?.lastSyncedAt ?? null
  const latestRecordDate = metaEnvelope?.meta?.latestRecordDate ?? null
  const rowCounts = metaEnvelope?.meta?.rowCounts ?? {}

  const rowCountSummary = Object.entries(rowCounts)
    .map(([k, v]) => `${v} ${k}`)
    .join(', ') || 'No records'

  if (!lastSyncedAt) {
    return {
      channel,
      lastSyncedAt: null,
      latestRecordDate: null,
      rowCountSummary,
      level: 'stale',
      isStale: true,
      ageHours: null,
      formattedIst: 'Never synced',
    }
  }

  const syncTime = parseTimestampMs(lastSyncedAt)
  if (isNaN(syncTime)) {
    return {
      channel,
      lastSyncedAt,
      latestRecordDate,
      rowCountSummary,
      level: 'stale',
      isStale: true,
      ageHours: null,
      formattedIst: 'Invalid timestamp',
    }
  }

  const ageHours = hoursSince(lastSyncedAt, referenceInstant)
  const cadence = customCadences[channel] ?? 24

  let level: SyncHealthLevel = 'fresh'
  if (ageHours > cadence * 4) {
    level = 'stale'
  } else if (ageHours > cadence * 2) {
    level = 'delayed'
  }

  return {
    channel,
    lastSyncedAt,
    latestRecordDate,
    rowCountSummary,
    level,
    isStale: level === 'stale',
    ageHours: Math.round(ageHours * 10) / 10,
    formattedIst: formatIstDateTime(lastSyncedAt),
  }
}

export function getHealthSnapshot(
  channels: Record<string, ChannelFileMetaEnvelope | null | undefined>,
  referenceInstant?: TZDate | Date,
): Record<string, ChannelHealthSnapshot> {
  const result: Record<string, ChannelHealthSnapshot> = {}
  for (const [ch, envelope] of Object.entries(channels)) {
    result[ch] = computeSyncHealth(ch, envelope, referenceInstant)
  }
  return result
}
