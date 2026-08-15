import type { CSSProperties } from 'react'
import { computeSyncHealth, type ChannelFileMetaEnvelope } from '@/data/health'

export interface LastSyncedBadgeProps {
  readonly channel: string
  readonly metaEnvelope?: ChannelFileMetaEnvelope | null
  readonly className?: string
  readonly style?: CSSProperties
}

/**
 * LastSyncedBadge (items 5.13, 5.14; TAD §8.1).
 *
 * Sync freshness next to the data-source subtitle:
 * - fresh: within the channel's normal cadence
 * - delayed: past 2x cadence
 * - stale: past 4x cadence
 *
 * The state is always spelled out in the label ("Synced 3h ago", "Stale (5d
 * ago)"), never carried by colour alone (item 5.20). Hover shows the absolute
 * IST timestamp, the latest record date, and row counts.
 *
 * `metaEnvelope` must be supplied — with nothing passed, `computeSyncHealth`
 * reports "Never synced" for every channel. Pages get it from
 * `useChannelMeta(channel)`.
 */
const LEVEL_HUE: Record<string, string> = {
  stale: 'var(--hue-red)',
  delayed: 'var(--hue-yellow)',
  fresh: 'var(--hue-green)',
}

/** Hours are unreadable past a couple of days — "Synced 1056h ago" is a number
 *  the reader has to divide before it means anything. Switch to days at 48h. */
function humaniseAge(ageHours: number): string {
  if (ageHours < 1) return 'just now'
  if (ageHours < 48) return `${Math.round(ageHours)}h ago`
  return `${Math.round(ageHours / 24)}d ago`
}

export function LastSyncedBadge({ channel, metaEnvelope, className, style }: LastSyncedBadgeProps) {
  const health = computeSyncHealth(channel, metaEnvelope)

  let label: string
  if (health.ageHours === null) {
    label = 'Never synced'
  } else if (health.level === 'stale') {
    label = `Stale — synced ${humaniseAge(health.ageHours)}`
  } else if (health.level === 'delayed') {
    label = `Sync delayed — ${humaniseAge(health.ageHours)}`
  } else {
    label = health.ageHours < 1 ? 'Synced just now' : `Synced ${humaniseAge(health.ageHours)}`
  }

  const tooltip = `Channel: ${channel}\nLast Synced: ${health.formattedIst}\nLatest Record: ${health.latestRecordDate ?? 'N/A'}\nRecords: ${health.rowCountSummary}`

  return (
    <span
      role="status"
      aria-label={`Sync freshness for ${channel}: ${label}`}
      title={tooltip}
      className={className ? `sync-badge ${className}` : 'sync-badge'}
      style={{ '--sync-hue': LEVEL_HUE[health.level] ?? 'var(--color-border)', ...style } as CSSProperties}
    >
      {label}
    </span>
  )
}
