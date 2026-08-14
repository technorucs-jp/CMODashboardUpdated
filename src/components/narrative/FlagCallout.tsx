import type { NarrativeRenderResult } from '@/lib/narrative/renderer'

export interface FlagCalloutProps {
  readonly flag: NarrativeRenderResult
}

export function FlagCallout({ flag }: FlagCalloutProps) {
  const borderHue =
    flag.severity === 'critical'
      ? 'var(--hue-red)'
      : flag.severity === 'watch'
        ? 'var(--hue-yellow)'
        : 'var(--hue-green)'

  const tierBadgeBg =
    flag.tier === 'immediate'
      ? 'var(--hue-red)'
      : flag.tier === 'process'
        ? 'var(--hue-yellow)'
        : flag.tier === 'strategic'
          ? 'var(--accent-1)'
          : 'var(--surface-2)'

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${borderHue}`,
        padding: '14px 16px',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
          {flag.headline}
        </div>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            background: tierBadgeBg,
            color: flag.tier === 'observation' ? 'var(--text-secondary)' : '#ffffff',
          }}
        >
          {flag.tier}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {flag.body}
      </div>
    </div>
  )
}
