import type { ReactNode } from 'react'

/**
 * Item 2.9 — primary value + supporting detail line(s), channel accent hue,
 * `tabular-nums` so figures don't jitter horizontally as they update.
 * `components/` never computes a metric (TAD §11.1) — every value here
 * arrives pre-formatted from a view model; this component only lays it out.
 */
export interface KpiCardProps {
  readonly label: string
  /** Pre-formatted — e.g. '₹38,423', not a raw number (P6: components never compute). */
  readonly value: string
  readonly detail?: ReactNode
  /** One of tokens.css's --accent-1..8 (TAD P8) — never a literal hex here. */
  readonly accent: string
}

export function KpiCard({ label, value, detail, accent }: KpiCardProps) {
  return (
    <div className="card" style={{ borderLeft: `3px solid ${accent}`, padding: '12px 16px' }}>
      <div style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</div>
      {detail && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{detail}</div>
      )}
    </div>
  )
}
