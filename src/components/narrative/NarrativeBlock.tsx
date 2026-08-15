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
    <section className="narrative">
      <h2 className="section-title">Performance narrative &amp; diagnostics</h2>

      <div className="split-grid">
        <div>
          <h3 className="subsection-title">What&apos;s working</h3>
          {working.length === 0 ? (
            <p className="narrative-empty">No positive trends flagged for this range.</p>
          ) : (
            working.map((f) => <FlagCallout key={f.id} flag={f} />)
          )}
        </div>

        <div>
          <h3 className="subsection-title">What needs attention</h3>
          {needsAttention.length === 0 ? (
            <p className="narrative-empty">No critical issues or anomalies flagged.</p>
          ) : (
            needsAttention.map((f) => <FlagCallout key={f.id} flag={f} />)
          )}
        </div>
      </div>
    </section>
  )
}
