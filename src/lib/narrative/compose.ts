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

  return relevantFlags.map((flag) =>
    renderFlagNarrative(flag, narratives?.phrasings?.[flag.id]),
  )
}
