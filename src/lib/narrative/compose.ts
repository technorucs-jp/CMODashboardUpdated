import type { ChannelId } from '../rules/types'
import { evaluateRules, type RuleEngineInput } from '../rules/engine'
import type { RuleThresholds } from '../rules/types'
import { renderFlagNarrative, type NarrativeRenderResult, type PhrasingInput } from './renderer'

export interface NarrativesMap {
  readonly phrasings?: Record<string, PhrasingInput>
}

export function composeTabNarrative(
  channel: ChannelId | 'overview' | 'cross-channel',
  inputs: RuleEngineInput,
  narratives?: NarrativesMap | null,
  thresholds?: Partial<RuleThresholds>,
): NarrativeRenderResult[] {
  const allFlags = evaluateRules(inputs, thresholds)

  const relevantFlags =
    channel === 'overview'
      ? allFlags
      : allFlags.filter((f) => f.channel === channel)

  // A rule ID identifies the *type* of flag (and is the narratives.json phrasing
  // lookup key, ADR-004) — it is not unique per instance. Several rules fire once
  // per subject (per ad set, per owner, per country, per competitor), so the same
  // rule ID can appear multiple times in one range. Disambiguate every occurrence
  // after the first so `id` stays a valid React list key downstream (ActionList,
  // NarrativeBlock) — without this, two ad sets both flagged for
  // spend-no-conversions collide on the same key and React silently drops one.
  const seen = new Map<string, number>()
  return relevantFlags.map((flag) => {
    const rendered = renderFlagNarrative(flag, narratives?.phrasings?.[flag.id])
    const occurrence = seen.get(flag.id) ?? 0
    seen.set(flag.id, occurrence + 1)
    return occurrence === 0 ? rendered : { ...rendered, id: `${rendered.id}#${occurrence}` }
  })
}
