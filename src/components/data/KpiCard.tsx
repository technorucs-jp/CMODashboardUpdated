import type { CSSProperties, ReactNode } from 'react'

/**
 * Item 2.9 — primary value + supporting detail line(s), channel accent hue,
 * `tabular-nums` so figures don't jitter horizontally as they update.
 * `components/` never computes a metric (TAD §11.1) — every value here
 * arrives pre-formatted from a view model; this component only lays it out.
 *
 * The accent drives a coloured top rule and the figure's colour, matching the
 * KPI row in Wireframe/01-overview-june-b.jpg. It is passed through a CSS
 * custom property rather than an inline `color`, so the styling stays in
 * index.css and this file carries no literal colour value (P8).
 */
export interface KpiCardProps {
  readonly label: string
  /** Pre-formatted — e.g. '₹38,423', not a raw number (P6: components never compute). */
  readonly value: string
  readonly detail?: ReactNode
  /** One of tokens.css's --accent-1..8 (TAD P8) — never a literal hex here. */
  readonly accent: string
}

/**
 * A value carrying no digits is a state, not a figure — "n/a for multi-day
 * ranges" (reach, unique visitors) or "—". Rendering those at the 24px figure
 * size makes a caveat shout louder than the numbers around it and wrap across
 * three lines, so they step down to body size while keeping the accent.
 */
function isFigure(value: string): boolean {
  return /\d/.test(value)
}

export function KpiCard({ label, value, detail, accent }: KpiCardProps) {
  return (
    <div className="card kpi-card" style={{ '--kpi-accent': accent } as CSSProperties}>
      <div className={isFigure(value) ? 'kpi-value' : 'kpi-value kpi-value-text'}>{value}</div>
      <div className="kpi-label">{label}</div>
      {detail && <div className="kpi-detail">{detail}</div>}
    </div>
  )
}
