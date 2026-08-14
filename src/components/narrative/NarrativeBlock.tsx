import type { NarrativeRenderResult } from '@/lib/narrative/renderer'
import { FlagCallout } from './FlagCallout'

export interface NarrativeBlockProps {
  readonly flags: readonly NarrativeRenderResult[]
}

export function NarrativeBlock({ flags }: NarrativeBlockProps) {
  const working = flags.filter((f) => f.severity === 'positive' || f.tier === 'observation')
  const needsAttention = flags.filter((f) => f.severity === 'critical' || f.severity === 'watch')

  if (flags.length === 0) {
    return null
  }

  return (
    <div style={{ marginTop: 32 }}>
      <h2>Performance Narrative & Diagnostics</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        <div>
          <h3>What's Working</h3>
          {working.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No positive trends flagged for this range.</p>
          ) : (
            working.map((f) => <FlagCallout key={f.id} flag={f} />)
          )}
        </div>

        <div>
          <h3>What Needs Attention</h3>
          {needsAttention.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No critical issues or anomalies flagged.</p>
          ) : (
            needsAttention.map((f) => <FlagCallout key={f.id} flag={f} />)
          )}
        </div>
      </div>
    </div>
  )
}
