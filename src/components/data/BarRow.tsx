/**
 * Item 2.12 — horizontal labelled bar with value + share, matching
 * `02-leads-top.jpg`'s "Inbound sources" and "status distribution" rows:
 * label above, a proportional bar, and a right-aligned "count (share)" value.
 */
export interface BarRowProps {
  readonly label: string
  /** Pre-formatted — e.g. '48 (98%)'. Components never compute a share themselves. */
  readonly value: string
  /** 0-100, drives the filled portion's width. */
  readonly sharePercent: number
  /** A tokens.css CSS var, e.g. 'var(--accent-1)' — never a literal hex. */
  readonly color: string
}

export function BarRow({ label, value, sharePercent, color }: BarRowProps) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(sharePercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height: 8, borderRadius: 4, background: 'var(--color-border)', position: 'relative', overflow: 'hidden' }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, sharePercent))}%`,
            height: '100%',
            background: color,
          }}
        />
      </div>
    </div>
  )
}
