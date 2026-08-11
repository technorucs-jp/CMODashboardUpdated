import type { Coverage } from '@/lib/coverage/coverage'

/**
 * Item 3.1 — shared between two `Coverage` kinds that both need a gap called
 * out explicitly, never silently clipped: the common 'partial' case (most
 * channels — data shown for the overlapping portion, with what's missing
 * stated) and LinkedIn's 'requires-full-coverage' (item 3.36 — a harder gate,
 * no data shown at all, only the gap). The `coverage` prop must be one of
 * those two kinds; anything else is a caller error.
 */
export interface PartialDataWarningProps {
  readonly coverage: Extract<Coverage, { kind: 'partial' | 'requires-full-coverage' }>
}

export function PartialDataWarning({ coverage }: PartialDataWarningProps) {
  if (coverage.kind === 'requires-full-coverage') {
    const gapText = coverage.gaps.map((g) => (g.from === g.to ? g.from : `${g.from} to ${g.to}`)).join(', ')
    return (
      <div className="card" style={{ padding: 16, borderColor: 'var(--status-monitor-dot)' }} role="alert">
        This range is not fully covered by uploaded data. Missing: {gapText || 'the entire range'}. Numbers are hidden
        rather than shown incomplete — see the runbook to request a fresh upload.
      </div>
    )
  }

  const parts: string[] = []
  if (coverage.missingBefore) parts.push(`before ${coverage.missingBefore}`)
  if (coverage.missingAfter) parts.push(`after ${coverage.missingAfter}`)

  return (
    <div className="card" style={{ padding: 16, borderColor: 'var(--status-monitor-dot)' }} role="alert">
      Showing data for {coverage.available.from} to {coverage.available.to} only — no data {parts.join(' and ')} is
      available.
    </div>
  )
}
