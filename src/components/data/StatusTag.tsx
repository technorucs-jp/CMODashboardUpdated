import type { Status } from '@/lib/metrics/status'

/**
 * Item 2.10 — BRD Appendix A's four statuses. Colour AND text label — never
 * colour-only (TAD §12.5 accessibility: status must be legible without colour
 * vision). Token triples (bg/dot/text) come from tokens.css, not literal hex.
 */
const STATUS_LABELS: Record<Status, string> = {
  leading: 'Leading',
  good: 'Good',
  monitor: 'Monitor',
  'action-needed': 'Action needed',
}

const STATUS_TOKEN_PREFIX: Record<Status, string> = {
  leading: '--status-leading',
  good: '--status-good',
  monitor: '--status-monitor',
  'action-needed': '--status-action-needed',
}

export interface StatusTagProps {
  readonly status: Status
}

export function StatusTag({ status }: StatusTagProps) {
  const prefix = STATUS_TOKEN_PREFIX[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 'var(--radius-base)',
        background: `var(${prefix}-bg)`,
        color: `var(${prefix}-text)`,
        fontSize: 12,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: '50%', background: `var(${prefix}-dot)`, display: 'inline-block' }}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
