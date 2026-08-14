export type ChannelId = 'meta-ads' | 'zoho-crm' | 'ga4' | 'gsc' | 'linkedin' | 'email' | 'cross-channel'

/**
 * Flag structure for the Rules & Narrative Engine (TAD §10.1, items 4.1-4.13).
 *
 * Rule modules are 100% pure functions (P6) — no React, no DOM, no fetch.
 * Flags carry their own numbers; phrasing templates fill slots from `flag.values`.
 */

export type FlagSeverity = 'positive' | 'watch' | 'critical'
export type FlagTier = 'immediate' | 'process' | 'strategic' | 'observation'

export interface Flag {
  readonly id: string
  readonly channel: ChannelId
  readonly severity: FlagSeverity
  readonly tier: FlagTier
  readonly subject: string
  readonly values: Record<string, number | string | null>
  readonly ruleVersion: number
}

export interface RuleThresholds {
  readonly metaCostPerConvOutlierMultiple: number // default 2.5x
  readonly metaSpendNoConvFloor: number // default ₹500
  readonly metaAudienceOverlapMinAdSets: number // default 3
  readonly zohoStuckInAttemptedSharePct: number // default 40%
  readonly zohoOwnerConcentrationSharePct: number // default 70%
  readonly zohoMeetingsZeroLeadFloor: number // default 20
  readonly ga4BotBouncePct: number // default 60%
  readonly ga4BotDurationMaxSec: number // default 10s
  readonly gscBrandDominancePct: number // default 80%
  readonly gscZeroClickMinImpressions: number // default 100
  readonly gscZeroClickMinPosition: number // default 50
}

export const DEFAULT_THRESHOLDS: RuleThresholds = {
  metaCostPerConvOutlierMultiple: 2.5,
  metaSpendNoConvFloor: 500,
  metaAudienceOverlapMinAdSets: 3,
  zohoStuckInAttemptedSharePct: 40,
  zohoOwnerConcentrationSharePct: 70,
  zohoMeetingsZeroLeadFloor: 20,
  ga4BotBouncePct: 60,
  ga4BotDurationMaxSec: 10,
  gscBrandDominancePct: 80,
  gscZeroClickMinImpressions: 100,
  gscZeroClickMinPosition: 50,
}
