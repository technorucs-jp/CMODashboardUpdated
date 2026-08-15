import type { NarrativeRenderResult } from '@/lib/narrative/renderer'
import { FlagCallout } from './FlagCallout'

export interface ActionListProps {
  readonly flags: readonly NarrativeRenderResult[]
}

/** BRD §13's three tiers, in the order the wireframe presents them. */
const TIERS = [
  { id: 'immediate', title: 'Immediate — next 24-48h' },
  { id: 'process', title: 'Process & workflow improvements' },
  { id: 'strategic', title: 'Strategic & content opportunities' },
] as const

export function ActionList({ flags }: ActionListProps) {
  const byTier = TIERS.map((tier) => ({ ...tier, items: flags.filter((f) => f.tier === tier.id) }))

  if (byTier.every((t) => t.items.length === 0)) {
    return null
  }

  return (
    <section className="narrative">
      <h2 className="section-title">Recommended action items</h2>

      {byTier.map(
        (tier) =>
          tier.items.length > 0 && (
            <div key={tier.id}>
              <h3 className="subsection-title">{tier.title}</h3>
              {tier.items.map((f) => (
                <FlagCallout key={f.id} flag={f} />
              ))}
            </div>
          ),
      )}
    </section>
  )
}
