import type { Flag, FlagTier } from '../rules/types'
import { getDefaultTemplate } from './templates'

/**
 * Placeholder renderer (item 4.15, TAD §10.2).
 *
 * Renders `{placeholder}` and `{placeholder|plural:single,plural}` from `flag.values`.
 * Formats numbers cleanly with commas, decimal precision, and currency symbols.
 */

export interface NarrativeRenderResult {
  readonly id: string
  readonly channel: Flag['channel']
  readonly severity: Flag['severity']
  readonly tier: FlagTier
  readonly headline: string
  readonly body: string
}

export interface PhrasingInput {
  readonly headline: string
  readonly body: string
  readonly tier?: FlagTier
}

function formatValueForSlot(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return val.toLocaleString('en-IN')
    }
    // Has decimals
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return String(val)
}

export function fillTemplate(
  template: string,
  values: Record<string, number | string | null>,
  subject: string,
): string {
  const merged: Record<string, number | string | null> = { subject, ...values }

  return template.replace(/\{([^{}]+)\}/g, (_, slot: string) => {
    // 1. Pluralisation: {key|plural:one,many}
    if (slot.includes('|plural:')) {
      const [key, rulePart] = slot.split('|plural:')
      const count = Number(merged[key?.trim() ?? '']) || 0
      const [singular, plural] = (rulePart ?? '').split(',')
      return count === 1 ? (singular ?? '') : (plural ?? '')
    }

    // 2. Standard slot replacement
    const rawVal = merged[slot.trim()]
    return formatValueForSlot(rawVal)
  })
}

export function renderFlagNarrative(
  flag: Flag,
  authoredPhrasing?: PhrasingInput | null,
): NarrativeRenderResult {
  const template = authoredPhrasing ?? getDefaultTemplate(flag)

  const headline = fillTemplate(template.headline, flag.values, flag.subject)
  const body = fillTemplate(template.body, flag.values, flag.subject)
  const tier = template.tier ?? flag.tier

  return {
    id: flag.id,
    channel: flag.channel,
    severity: flag.severity,
    tier,
    headline,
    body,
  }
}
