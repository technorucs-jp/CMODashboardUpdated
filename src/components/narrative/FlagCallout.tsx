import type { CSSProperties } from 'react'
import type { NarrativeRenderResult } from '@/lib/narrative/renderer'

export interface FlagCalloutProps {
  readonly flag: NarrativeRenderResult
}

/** Severity drives the left rule; tier drives the chip. Both are stated in text
 *  as well as colour (item 5.20 — never colour-only meaning). */
const SEVERITY_HUE: Record<string, string> = {
  critical: 'var(--hue-red)',
  watch: 'var(--hue-yellow)',
  positive: 'var(--hue-green)',
}

const TIER_BG: Record<string, string> = {
  immediate: 'var(--hue-red)',
  process: 'var(--hue-yellow)',
  strategic: 'var(--accent-1)',
  observation: 'var(--color-surface-2)',
}

export function FlagCallout({ flag }: FlagCalloutProps) {
  const style = {
    '--flag-hue': SEVERITY_HUE[flag.severity] ?? 'var(--hue-green)',
    '--tier-bg': TIER_BG[flag.tier] ?? 'var(--color-surface-2)',
    // An observation chip sits on a neutral surface, so it keeps the normal
    // secondary text colour instead of the on-accent one.
    '--tier-fg': flag.tier === 'observation' ? 'var(--color-text-secondary)' : 'var(--color-on-accent)',
  } as CSSProperties

  return (
    <div className="card flag-callout" style={style}>
      <div className="flag-callout-head">
        <div className="flag-callout-headline">{flag.headline}</div>
        <span className="tier-badge">{flag.tier}</span>
      </div>
      <div className="flag-callout-body">{flag.body}</div>
    </div>
  )
}
