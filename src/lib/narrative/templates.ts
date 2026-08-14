import type { Flag, FlagTier } from '../rules/types'

/**
 * Built-in default phrasing templates for every rule (item 4.14, TAD §10.2).
 *
 * Safe fallback: if `narratives.json` is missing, corrupted, or has no entry
 * for a flag ID, these default templates ensure every flag renders a complete,
 * grammatically-correct sentence with live figures.
 */

export interface BuiltinTemplate {
  readonly headline: string
  readonly body: string
  readonly tier: FlagTier
}

export const DEFAULT_TEMPLATES: Record<string, BuiltinTemplate> = {
  'meta.adset.cost-per-conv-outlier': {
    headline: '{subject} at ₹{costPerConv} per conversation',
    body: 'Spent ₹{spend} for {conversations} messaging {conversations|plural:reply,replies} — {multiple}× the account average. Pause or merge into a better performing ad set.',
    tier: 'immediate',
  },
  'meta.adset.spend-no-conversions': {
    headline: '{subject} spent ₹{spend} with zero conversions',
    body: 'Ad set has accumulated ₹{spend} in spend across {impressions} impressions without generating any lead conversations. Review creative and targeting or pause.',
    tier: 'immediate',
  },
  'meta.adset.audience-overlap': {
    headline: 'Audience overlap detected for {subject}',
    body: '{count} active ad sets are targeting {product} in {region} simultaneously. Consolidate budgets to reduce auction self-competition.',
    tier: 'process',
  },
  'zoho.status.stuck-in-attempted': {
    headline: '{attemptedCount} leads ({attemptedSharePct}%) stuck in Attempted to Contact',
    body: 'A majority of inbound leads have not been reached. Implement structured follow-up cadences and multi-channel outreach.',
    tier: 'process',
  },
  'zoho.owner.concentration': {
    headline: 'Lead concentration: {owner} assigned {concentrationPct}% of leads',
    body: '{owner} holds {leadCount} of {totalAssigned} assigned leads. Redistribute inbound leads across the team to prevent follow-up bottlenecks.',
    tier: 'process',
  },
  'zoho.meetings.zero': {
    headline: 'Zero meetings scheduled across {totalLeads} inbound leads',
    body: 'No discovery meetings have been booked despite active lead volume. Review sales outreach scripts and qualification criteria.',
    tier: 'immediate',
  },
  'ga4.paid.no-attribution': {
    headline: 'Paid campaign traffic missing GA4 attribution',
    body: 'Meta Ads spent ₹{metaSpend} but GA4 reports {paidSocialSessions} Paid Social sessions. Verify UTM tagging parameters across all active ads.',
    tier: 'immediate',
  },
  'ga4.country.suspected-bot': {
    headline: 'Suspected bot traffic detected from {country}',
    body: '{country} generated {sessions} sessions with {bounceRatePct}% bounce rate and {avgDurationSec}s average duration. Review geo-targeting exclusion filters.',
    tier: 'process',
  },
  'gsc.brand-dominance': {
    headline: 'Brand search dominance at {brandSharePct}%',
    body: 'Organic search traffic is heavily concentrated in brand queries with only {nonBrandClicks} non-brand clicks. Expand non-brand SEO content to drive net-new discovery.',
    tier: 'strategic',
  },
  'gsc.zero-click-opportunity': {
    headline: 'High-visibility opportunity: "{query}"',
    body: '"{query}" earned {impressions} impressions at position #{position} with 0 clicks (gap to Page 1: +{gapToPage1}). Optimize on-page content to capture search traffic.',
    tier: 'strategic',
  },
  'linkedin.coverage.competitor-lead': {
    headline: 'TechnoRUCS leading LinkedIn engagement benchmark',
    body: 'Averaging {selfReactionsPerPost} reactions/post versus {competitor} at {competitorReactionsPerPost} reactions/post.',
    tier: 'observation',
  },
  'channel.status.degraded': {
    headline: '{subject} requires attention',
    body: 'Channel status is {status}: {reason}. Review performance drivers and execute remediation plan.',
    tier: 'immediate',
  },
}

export function getDefaultTemplate(flag: Flag): BuiltinTemplate {
  const t = DEFAULT_TEMPLATES[flag.id]
  if (t) return t

  return {
    headline: `${flag.subject} Flag (${flag.id})`,
    body: `Rule ${flag.id} fired for ${flag.subject}.`,
    tier: flag.tier,
  }
}
