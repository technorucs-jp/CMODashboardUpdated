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
 * Displays sync freshness next to the data source subtitle:
 * - Fresh (neutral): Within normal cadence
 * - Delayed (amber): Past 2x cadence
 * - Stale (red): Past 4x cadence
 *
 * Hover shows the absolute timestamp in Indian Standard Time (IST).
 */
export function LastSyncedBadge({
  channel,
  metaEnvelope,
  className,
  style,
}: LastSyncedBadgeProps) {
  const health = computeSyncHealth(channel, metaEnvelope)

  let badgeBg: string
  let badgeColor: string
  let borderColor: string
  let label: string

  if (health.level === 'stale') {
    badgeBg = 'rgba(239, 68, 68, 0.12)'
    badgeColor = 'var(--hue-red, #ef4444)'
    borderColor = 'var(--hue-red, #ef4444)'
    label = health.ageHours !== null ? `Stale (${Math.round(health.ageHours / 24)}d ago)` : 'Never synced'
  } else if (health.level === 'delayed') {
    badgeBg = 'rgba(245, 158, 11, 0.12)'
    badgeColor = 'var(--hue-yellow, #f59e0b)'
    borderColor = 'var(--hue-yellow, #f59e0b)'
    label = `Sync delayed (${Math.round(health.ageHours ?? 0)}h ago)`
  } else {
    badgeBg = 'rgba(34, 197, 94, 0.10)'
    badgeColor = 'var(--hue-green, #22c55e)'
    borderColor = 'rgba(34, 197, 94, 0.3)'
    label = health.ageHours !== null && health.ageHours < 1 ? 'Synced just now' : `Synced ${Math.round(health.ageHours ?? 0)}h ago`
  }

  const tooltip = `Channel: ${channel}\nLast Synced: ${health.formattedIst}\nLatest Record: ${health.latestRecordDate ?? 'N/A'}\nRecords: ${health.rowCountSummary}`

  return (
    <span
      role="status"
      aria-label={`Sync freshness for ${channel}: ${label}`}
      title={tooltip}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: badgeBg,
        color: badgeColor,
        border: `1px solid ${borderColor}`,
        cursor: 'help',
        userSelect: 'none',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: badgeColor,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  )
}
