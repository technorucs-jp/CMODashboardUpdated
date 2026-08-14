import type { Ga4QueryResult } from '../channels/ga4'
import type { GscQueryResult } from '../channels/gsc'
import type { LinkedInQueryResult } from '../channels/linkedin'
import type { MetaAdsQueryResult } from '../channels/metaAds'
import type { ZohoQueryResult } from '../channels/zoho'
import type { Status } from '../metrics/status'
import { resolve } from '../metrics/ratio'
import {
  DEFAULT_THRESHOLDS,
  type Flag,
  type RuleThresholds,
} from './types'

/**
 * Pure Rules Engine (TAD §10.1, items 4.1-4.13).
 *
 * (viewModel, thresholds) => Flag[]
 * PURE: No React, no fetch, no DOM globals. Importable in pure Node test environments.
 */

export interface RuleEngineInput {
  readonly metaAds?: MetaAdsQueryResult | null
  readonly ga4?: Ga4QueryResult | null
  readonly gsc?: GscQueryResult | null
  readonly linkedin?: LinkedInQueryResult | null
  readonly zoho?: ZohoQueryResult | null
  readonly channelStatuses?: readonly {
    readonly channel: string
    readonly status: Status
    readonly reason?: string
  }[] | null
}

export function evaluateRules(
  inputs: RuleEngineInput,
  overrides?: Partial<RuleThresholds>,
): Flag[] {
  const t: RuleThresholds = { ...DEFAULT_THRESHOLDS, ...overrides }
  const flags: Flag[] = []

  // -------------------------------------------------------------------------
  // 1. Meta Ads Rules (4.2, 4.3, 4.4)
  // -------------------------------------------------------------------------
  if (inputs.metaAds) {
    const meta = inputs.metaAds
    const adSetMap = new Map(meta.adSets.map((a) => [a.adSetId, a]))

    // Aggregate spend and conv per ad set
    const adSetAgg = new Map<string, { spend: number; conversations: number; impressions: number }>()
    for (const fact of meta.facts) {
      const existing = adSetAgg.get(fact.adSetId) ?? { spend: 0, conversations: 0, impressions: 0 }
      existing.spend += fact.spend
      existing.conversations += fact.conversations
      existing.impressions += fact.impressions
      adSetAgg.set(fact.adSetId, existing)
    }

    const totalSpend = meta.summary.spend
    const totalConv = meta.summary.conversations
    const accountAvgCpc = totalConv > 0 ? totalSpend / totalConv : 0

    for (const [adSetId, agg] of adSetAgg.entries()) {
      const adSet = adSetMap.get(adSetId)
      const name = adSet?.adSetName ?? adSetId
      const region = adSet?.region ?? 'General'

      // Item 4.2: meta.adset.cost-per-conv-outlier
      if (agg.conversations > 0 && accountAvgCpc > 0) {
        const cpc = agg.spend / agg.conversations
        const multiple = cpc / accountAvgCpc
        if (multiple >= t.metaCostPerConvOutlierMultiple) {
          flags.push({
            id: 'meta.adset.cost-per-conv-outlier',
            channel: 'meta-ads',
            severity: 'critical',
            tier: 'immediate',
            subject: name,
            values: {
              costPerConv: Number(cpc.toFixed(2)),
              multiple: Number(multiple.toFixed(1)),
              spend: Number(agg.spend.toFixed(2)),
              conversations: agg.conversations,
              accountAvgCpc: Number(accountAvgCpc.toFixed(2)),
              region,
            },
            ruleVersion: 1,
          })
        }
      }

      // Item 4.3: meta.adset.spend-no-conversions
      if (agg.spend >= t.metaSpendNoConvFloor && agg.conversations === 0) {
        flags.push({
          id: 'meta.adset.spend-no-conversions',
          channel: 'meta-ads',
          severity: 'critical',
          tier: 'immediate',
          subject: name,
          values: {
            spend: Number(agg.spend.toFixed(2)),
            conversations: 0,
            impressions: agg.impressions,
            region,
          },
          ruleVersion: 1,
        })
      }
    }

    // Item 4.4: meta.adset.audience-overlap
    // Group active ad sets by region + product
    const audienceGroups = new Map<string, { region: string; product: string; count: number }>()
    for (const [adSetId, agg] of adSetAgg.entries()) {
      if (agg.spend > 0) {
        const adSet = adSetMap.get(adSetId)
        const name = `${adSet?.campaignName ?? ''} ${adSet?.adSetName ?? ''}`
        const region = adSet?.region ?? 'Unknown'
        const product =
          name.includes('Business Central') || name.includes('BC ') || name.includes('BC -')
            ? 'Business Central'
            : name.includes('Azure')
              ? 'Azure'
              : name.includes('Power BI')
                ? 'Power BI'
                : 'Services'

        const key = `${region}__${product}`
        const group = audienceGroups.get(key) ?? { region, product, count: 0 }
        group.count += 1
        audienceGroups.set(key, group)
      }
    }

    for (const group of audienceGroups.values()) {
      if (group.count >= t.metaAudienceOverlapMinAdSets) {
        flags.push({
          id: 'meta.adset.audience-overlap',
          channel: 'meta-ads',
          severity: 'watch',
          tier: 'process',
          subject: `${group.product} — ${group.region} audience`,
          values: {
            count: group.count,
            region: group.region,
            product: group.product,
          },
          ruleVersion: 1,
        })
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. Zoho CRM Rules (4.5, 4.6, 4.7)
  // -------------------------------------------------------------------------
  if (inputs.zoho) {
    const zoho = inputs.zoho
    const totalLeads = zoho.summary.totalInbound

    if (totalLeads > 0) {
      // Item 4.5: zoho.status.stuck-in-attempted
      const attemptedCount = zoho.leads.filter((l) => l.leadStatus === 'Attempted to Contact').length
      const attemptedSharePct = (attemptedCount / totalLeads) * 100
      if (attemptedSharePct >= t.zohoStuckInAttemptedSharePct) {
        flags.push({
          id: 'zoho.status.stuck-in-attempted',
          channel: 'zoho-crm',
          severity: 'watch',
          tier: 'process',
          subject: 'Lead follow-up queue',
          values: {
            attemptedCount,
            totalCount: totalLeads,
            attemptedSharePct: Number(attemptedSharePct.toFixed(1)),
          },
          ruleVersion: 1,
        })
      }

      // Item 4.6: zoho.owner.concentration
      const ownerCounts = new Map<string, number>()
      let totalAssigned = 0
      for (const lead of zoho.leads) {
        if (lead.owner && lead.owner !== 'Unassigned') {
          ownerCounts.set(lead.owner, (ownerCounts.get(lead.owner) ?? 0) + 1)
          totalAssigned += 1
        }
      }

      for (const [owner, count] of ownerCounts.entries()) {
        const concentrationPct = totalAssigned > 0 ? (count / totalAssigned) * 100 : 0
        if (concentrationPct >= t.zohoOwnerConcentrationSharePct) {
          flags.push({
            id: 'zoho.owner.concentration',
            channel: 'zoho-crm',
            severity: 'watch',
            tier: 'process',
            subject: owner,
            values: {
              owner,
              leadCount: count,
              totalAssigned,
              concentrationPct: Number(concentrationPct.toFixed(1)),
            },
            ruleVersion: 1,
          })
        }
      }

      // Item 4.7: zoho.meetings.zero
      const meetingsScheduled = zoho.leads.filter((l) => l.leadStatus === 'Meeting Scheduled').length
      if (meetingsScheduled === 0 && totalLeads >= t.zohoMeetingsZeroLeadFloor) {
        flags.push({
          id: 'zoho.meetings.zero',
          channel: 'zoho-crm',
          severity: 'critical',
          tier: 'immediate',
          subject: 'Sales meeting pipeline',
          values: {
            meetings: 0,
            totalLeads,
          },
          ruleVersion: 1,
        })
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. GA4 Rules (4.8, 4.9)
  // -------------------------------------------------------------------------
  if (inputs.ga4) {
    const ga4 = inputs.ga4

    // Item 4.8: ga4.paid.no-attribution (Meta spend > 0 and Paid Social sessions = 0)
    if (inputs.metaAds && inputs.metaAds.summary.spend > 0) {
      const paidSocialSessions = ga4.channels
        .filter((c) => (c.channelGroup ?? '').toLowerCase().includes('paid social'))
        .reduce((sum, c) => sum + c.sessions, 0)

      if (paidSocialSessions === 0) {
        flags.push({
          id: 'ga4.paid.no-attribution',
          channel: 'ga4',
          severity: 'critical',
          tier: 'immediate',
          subject: 'Paid campaign tracking',
          values: {
            metaSpend: Number(inputs.metaAds.summary.spend.toFixed(2)),
            paidSocialSessions: 0,
          },
          ruleVersion: 1,
        })
      }
    }

    // Item 4.9: ga4.country.suspected-bot (bounce > 60% and duration < 10s with minimum traffic)
    // Aggregate by country across range
    const countryAgg = new Map<string, { engaged: number; bounced: number; duration: number }>()
    for (const c of ga4.countries) {
      const existing = countryAgg.get(c.country) ?? { engaged: 0, bounced: 0, duration: 0 }
      existing.engaged += c.engagedSessions
      existing.bounced += c.bouncedSessions
      existing.duration += c.totalSessionDurationSec
      countryAgg.set(c.country, existing)
    }

    for (const [countryName, agg] of countryAgg.entries()) {
      const sessions = agg.engaged + agg.bounced
      const bouncePct = sessions > 0 ? (agg.bounced / sessions) * 100 : 0
      const avgDuration = sessions > 0 ? agg.duration / sessions : 0

      if (sessions >= 20 && bouncePct >= t.ga4BotBouncePct && avgDuration <= t.ga4BotDurationMaxSec) {
        flags.push({
          id: 'ga4.country.suspected-bot',
          channel: 'ga4',
          severity: 'watch',
          tier: 'process',
          subject: `${countryName} traffic`,
          values: {
            country: countryName,
            bounceRatePct: Number(bouncePct.toFixed(1)),
            avgDurationSec: Math.round(avgDuration),
            sessions,
          },
          ruleVersion: 1,
        })
      }
    }
  }

  // -------------------------------------------------------------------------
  // 4. GSC Rules (4.10, 4.11)
  // -------------------------------------------------------------------------
  if (inputs.gsc) {
    const gsc = inputs.gsc
    const brandShareVal = resolve(gsc.summary.brandClickShare)

    // Item 4.10: gsc.brand-dominance
    if (brandShareVal !== null) {
      const brandSharePct = brandShareVal * 100
      if (brandSharePct >= t.gscBrandDominancePct) {
        flags.push({
          id: 'gsc.brand-dominance',
          channel: 'gsc',
          severity: 'watch',
          tier: 'strategic',
          subject: 'Search brand vs non-brand split',
          values: {
            brandSharePct: Number(brandSharePct.toFixed(1)),
            nonBrandClicks: gsc.summary.nonBrandClicks,
            totalClicks: gsc.summary.clicks,
          },
          ruleVersion: 1,
        })
      }
    }

    // Item 4.11: gsc.zero-click-opportunity
    const queryAgg = new Map<string, { clicks: number; impressions: number; sumPosition: number }>()
    for (const q of gsc.queries) {
      const existing = queryAgg.get(q.query) ?? { clicks: 0, impressions: 0, sumPosition: 0 }
      existing.clicks += q.clicks
      existing.impressions += q.impressions
      existing.sumPosition += q.sumPosition
      queryAgg.set(q.query, existing)
    }

    const zeroClickCandidates: { query: string; impressions: number; avgPos: number }[] = []
    for (const [queryText, agg] of queryAgg.entries()) {
      if (agg.clicks === 0 && agg.impressions >= t.gscZeroClickMinImpressions) {
        const avgPos = agg.impressions > 0 ? agg.sumPosition / agg.impressions : 0
        if (avgPos >= t.gscZeroClickMinPosition) {
          zeroClickCandidates.push({ query: queryText, impressions: agg.impressions, avgPos })
        }
      }
    }

    zeroClickCandidates.sort((a, b) => b.impressions - a.impressions)
    if (zeroClickCandidates.length > 0) {
      const topOpp = zeroClickCandidates[0]
      const gap = Math.max(0, topOpp.avgPos - 10)
      flags.push({
        id: 'gsc.zero-click-opportunity',
        channel: 'gsc',
        severity: 'positive',
        tier: 'strategic',
        subject: topOpp.query,
        values: {
          query: topOpp.query,
          impressions: topOpp.impressions,
          position: Number(topOpp.avgPos.toFixed(1)),
          gapToPage1: Number(gap.toFixed(1)),
        },
        ruleVersion: 1,
      })
    }
  }

  // -------------------------------------------------------------------------
  // 5. LinkedIn Rules (4.12)
  // -------------------------------------------------------------------------
  if (inputs.linkedin) {
    const linkedin = inputs.linkedin
    const selfReactionsPerPost = resolve(linkedin.summary.reactionsPerPost) ?? 0

    for (const comp of linkedin.competitors) {
      const compRate = comp.posts > 0 ? comp.reactions / comp.posts : 0
      if (selfReactionsPerPost > compRate) {
        flags.push({
          id: 'linkedin.coverage.competitor-lead',
          channel: 'linkedin',
          severity: 'positive',
          tier: 'observation',
          subject: 'LinkedIn engagement benchmark',
          values: {
            selfReactionsPerPost: Number(selfReactionsPerPost.toFixed(1)),
            competitorReactionsPerPost: Number(compRate.toFixed(1)),
            competitor: comp.page,
          },
          ruleVersion: 1,
        })
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. Cross-Channel Health Rules (4.13)
  // -------------------------------------------------------------------------
  if (inputs.channelStatuses) {
    for (const cs of inputs.channelStatuses) {
      if (cs.status === 'action-needed') {
        flags.push({
          id: 'channel.status.degraded',
          channel: 'cross-channel',
          severity: 'critical',
          tier: 'immediate',
          subject: `${cs.channel.toUpperCase()} Channel Health`,
          values: {
            channel: cs.channel,
            status: cs.status,
            reason: cs.reason ?? 'Performance degraded below threshold',
          },
          ruleVersion: 1,
        })
      }
    }
  }

  return flags
}
