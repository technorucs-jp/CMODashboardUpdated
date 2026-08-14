import type { NarrativeRenderResult } from '@/lib/narrative/renderer'
import { FlagCallout } from './FlagCallout'

export interface ActionListProps {
  readonly flags: readonly NarrativeRenderResult[]
}

export function ActionList({ flags }: ActionListProps) {
  const immediate = flags.filter((f) => f.tier === 'immediate')
  const process = flags.filter((f) => f.tier === 'process')
  const strategic = flags.filter((f) => f.tier === 'strategic')

  const totalActions = immediate.length + process.length + strategic.length
  if (totalActions === 0) {
    return null
  }

  return (
    <div style={{ marginTop: 24 }}>
      <h2>Recommended Action Items</h2>

      {immediate.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: 'var(--hue-red)' }}>Immediate Actions (Next 24-48h)</h3>
          {immediate.map((f) => (
            <FlagCallout key={f.id} flag={f} />
          ))}
        </div>
      )}

      {process.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: 'var(--hue-yellow)' }}>Process & Workflow Improvements</h3>
          {process.map((f) => (
            <FlagCallout key={f.id} flag={f} />
          ))}
        </div>
      )}

      {strategic.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: 'var(--accent-1)' }}>Strategic & Content Opportunities</h3>
          {strategic.map((f) => (
            <FlagCallout key={f.id} flag={f} />
          ))}
        </div>
      )}
    </div>
  )
}
