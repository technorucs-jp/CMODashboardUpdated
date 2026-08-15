#!/usr/bin/env node
/**
 * tests/fixtures/generate.mjs — item 1.20.
 *
 * Generates the six public/data-shaped fixture files (May-July 2026) used by
 * Phase 1's unit/contract tests and the reconciliation harness. Kept as a
 * script rather than hand-typed JSON so the headline June totals — which the
 * reconciliation golden file (item 1.31) checks exactly — are correct BY
 * CONSTRUCTION (the generator sums its own inputs) rather than by careful
 * manual arithmetic that's easy to get subtly wrong.
 *
 * Precision note, stated plainly rather than implied: the June HEADLINE
 * figures below (spend/impressions/clicks/conversations for Meta, totals for
 * GA4/GSC, lead/status counts for Zoho, overview cards for LinkedIn) are
 * reverse-engineered to match the specific numbers named across TASK.md,
 * CHECKLIST.md, and the BRD/TRD/TAD text. Secondary breakdowns this session
 * did not have specific reconciliation numbers for (e.g. every GA4 country
 * row, most GSC query rows beyond the ones named in Phase 3/4 items, most
 * LinkedIn audience percentages) are plausible placeholder data — schema-valid
 * and internally consistent, not verified against a wireframe image pixel by
 * pixel. July is lighter/plausible throughout; a July reconciliation golden
 * file is a later Phase 3 task per the original checklist's own phasing.
 *
 * **Update (Overview tab, items 3.2-3.6, 2026-08-14):** May's Meta Ads/GA4/GSC/Zoho
 * headline figures are now ALSO reconciled — to Wireframe/08-overview-may2026.jpg and
 * 09-overview-comparemom.jpg — because Overview's channel-health table and
 * period-comparison blocks are the first things in this build that actually display a
 * May-to-June delta, and an unreconciled May made every one of those deltas fabricated
 * rather than real. LinkedIn's fixture deliberately stays June-only (item 1.27's own
 * reasoning, unchanged) — Overview's LinkedIn period-comparison row therefore shows a
 * genuine coverage gap for a May comparison rather than the wireframe's real numbers;
 * see src/viewmodels/overview.ts's header comment for why that is correct behaviour,
 * not a shortfall.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname)

function write(name, data) {
  writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n')
  console.log(`wrote ${name}`)
}

function iso(date, days) {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Splits `total` into `n` integer parts summing exactly to `total`. */
function splitInt(total, n) {
  const base = Math.floor(total / n)
  const remainder = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0))
}

/** Splits `total` (a float, e.g. currency) into `n` parts summing exactly to `total`, 2dp. */
function splitFloat(total, n) {
  const cents = Math.round(total * 100)
  const parts = splitInt(cents, n)
  return parts.map((c) => c / 100)
}

const ENVELOPE_META = {
  lastSyncedAt: '2026-08-10T09:03:11+05:30',
  earliestRecordDate: '2026-05-01',
  latestRecordDate: '2026-08-09',
  coworkRunId: 'run_2026-08-10T0900',
}

// ===========================================================================
// meta-ads.json
// ===========================================================================
function buildMetaAds() {
  // Real data read directly off Wireframe/07-adcampaigns-{top,mid1,mid2,bottom}.jpg
  // (item 1.20's original generation predates an actual close look at these images —
  // corrected here once the wireframe was actually inspected while building Phase 2's
  // Ad Campaigns tab). All 13 rows sum exactly to the June headline totals already
  // reconciled (spend 38,423.31 / impressions 95,823 / clicks 655 / conversations 101).
  //
  // Campaign grouping matches the wireframe's own narrative: "Consolidate the four
  // simultaneous BC Australia campaigns... launched on 10 Jun, 11 Jun, 17 Jun, and
  // 22 Jun" — that's exactly bc-au-10jun/bc-au-11jun/bc-au-17jun/bc-au-video-22jun,
  // one campaign (camp-bc-au), which is what item 4.4's audience-overlap rule fires on.
  //
  // Reach note (worth its own line): summing all 13 ad sets' reach below gives exactly
  // 58,392 — which is precisely the (double-counted, wrong) figure the wireframe's own
  // Total Leads tab shows, while the Ad Campaigns tab's account-overview card shows the
  // true deduplicated reach as 52,527 for the same June period. This is the wireframe
  // itself demonstrating the exact non-additive-reach trap P1/TAD §9.2 exists to
  // prevent — concrete evidence for why this app's reach handling (item 2.16: null for
  // multi-day ranges, never a summed total) is the only defensible choice, not merely
  // a cautious one.
  const adSets = [
    { adSetId: 'as-construction-au-11jun', adSetName: 'Construction Co. Australia', campaignId: 'camp-construction-au', campaignName: 'Construction AU', launchDate: '2026-06-11', region: 'AU' },
    { adSetId: 'as-bc-3-emirates', adSetName: 'Business Central — 3 Emirates', campaignId: 'camp-bc-3-emirates', campaignName: 'Business Central Emirates', launchDate: '2026-06-03', region: 'AE/ME' },
    { adSetId: 'as-azure-india-video', adSetName: 'Azure — India (Video)', campaignId: 'camp-azure-india', campaignName: 'Azure Migration India', launchDate: '2026-06-22', region: 'IN/Kerala' },
    { adSetId: 'as-azure-srilanka-video', adSetName: 'Azure — Sri Lanka (Video)', campaignId: 'camp-azure-srilanka', campaignName: 'Azure Migration Sri Lanka', launchDate: '2026-06-22', region: 'LK' },
    { adSetId: 'as-bc-au-11jun', adSetName: 'Business Central — Australia', campaignId: 'camp-bc-au', campaignName: 'Business Central AU', launchDate: '2026-06-11', region: 'AU' },
    { adSetId: 'as-bc-uae-sa', adSetName: 'Business Central — UAE & SA', campaignId: 'camp-bc-uae-sa', campaignName: 'Business Central UAE & SA', launchDate: '2026-06-01', region: 'AE/SA' },
    { adSetId: 'as-construction-au-17jun', adSetName: 'Construction Co. Australia', campaignId: 'camp-construction-au', campaignName: 'Construction AU', launchDate: '2026-06-17', region: 'AU' },
    { adSetId: 'as-bc-au-17jun', adSetName: 'Business Central — Australia', campaignId: 'camp-bc-au', campaignName: 'Business Central AU', launchDate: '2026-06-17', region: 'AU' },
    { adSetId: 'as-azure-tn', adSetName: 'Azure — Tamil Nadu', campaignId: 'camp-azure-tn', campaignName: 'Azure Migration TN', launchDate: '2026-05-22', region: 'IN/TN' },
    { adSetId: 'as-bc-middle-east', adSetName: 'Business Central — Middle East', campaignId: 'camp-bc-me', campaignName: 'Business Central Middle East', launchDate: '2026-06-11', region: 'ME' },
    { adSetId: 'as-bc-au-video-22jun', adSetName: 'BC Australia — Video', campaignId: 'camp-bc-au', campaignName: 'Business Central AU', launchDate: '2026-06-22', region: 'AU' },
    { adSetId: 'as-azure-managed-india', adSetName: 'Azure Managed — India', campaignId: 'camp-azure-managed-india', campaignName: 'Azure Managed India', launchDate: '2026-06-29', region: 'IN' },
    { adSetId: 'as-bc-au-10jun', adSetName: 'Business Central — Australia', campaignId: 'camp-bc-au', campaignName: 'Business Central AU', launchDate: '2026-06-10', region: 'AU' },
  ]

  // May — reconciled to Wireframe/08-overview-may2026.jpg and 09-overview-comparemom.jpg
  // (item 3.2-3.6's Overview tab, built 2026-08-14): spend ₹31,375, conversations 178,
  // cost/conv ₹176 (derived), impressions 138,000 (CPM derives to ₹227, matching the
  // wireframe's "138K"/"₹227" figures), across exactly 10 distinct campaigns — one ad
  // set per campaign, entirely separate from June's reconciled camp-* namespace so
  // touching this doesn't disturb any already-reconciled June figure or rule fixture
  // (item 4.2-4.4's rules fire on specific June ad sets/campaigns by ID).
  // Three of these deliberately REUSE a June campaignId (camp-azure-tn,
  // camp-azure-managed-india, camp-bc-uae-sa) so the Total Leads tab has real
  // period-over-period pairs to compare. Without any overlap that tab's whole
  // reason for existing collapses: every campaign reads "31 / 0" and every
  // Lead Δ% reads "—". The wireframe (10-totalleads-mid.jpg) behaves exactly
  // this way — mostly disjoint campaigns month to month, with Azure TN, Azure
  // Managed India and BC UAE&SA appearing in both. May still has 10 distinct
  // campaigns, so the "9 vs 10" active-campaign card is unchanged, and no
  // per-ad-set figure moves, so May's reconciled totals are untouched.
  const MAY_AD_SETS = [
    { adSetId: 'as-may-bc-uae', adSetName: 'Business Central — UAE', campaignId: 'camp-may-bc-uae', campaignName: 'Business Central UAE', launchDate: '2026-05-01', region: 'AE', conversations: 35 },
    { adSetId: 'as-may-construction-au', adSetName: 'Construction Co. Australia', campaignId: 'camp-may-construction-au', campaignName: 'Construction AU', launchDate: '2026-05-01', region: 'AU', conversations: 28 },
    { adSetId: 'as-may-azure-tn', adSetName: 'Azure — Tamil Nadu', campaignId: 'camp-azure-tn', campaignName: 'Azure Migration TN', launchDate: '2026-05-01', region: 'IN/TN', conversations: 22 },
    { adSetId: 'as-may-bc-3-emirates', adSetName: 'Business Central — 3 Emirates', campaignId: 'camp-may-bc-3-emirates', campaignName: 'Business Central Emirates', launchDate: '2026-05-01', region: 'AE/ME', conversations: 19 },
    { adSetId: 'as-may-azure-india', adSetName: 'Azure — India', campaignId: 'camp-may-azure-india', campaignName: 'Azure Migration India', launchDate: '2026-05-01', region: 'IN', conversations: 17 },
    { adSetId: 'as-may-bc-au', adSetName: 'Business Central — Australia', campaignId: 'camp-may-bc-au', campaignName: 'Business Central AU', launchDate: '2026-05-01', region: 'AU', conversations: 15 },
    { adSetId: 'as-may-bc-me', adSetName: 'Business Central — Middle East', campaignId: 'camp-may-bc-me', campaignName: 'Business Central Middle East', launchDate: '2026-05-01', region: 'ME', conversations: 13 },
    { adSetId: 'as-may-azure-srilanka', adSetName: 'Azure — Sri Lanka', campaignId: 'camp-may-azure-srilanka', campaignName: 'Azure Migration Sri Lanka', launchDate: '2026-05-01', region: 'LK', conversations: 11 },
    { adSetId: 'as-may-azure-managed-india', adSetName: 'Azure Managed — India', campaignId: 'camp-azure-managed-india', campaignName: 'Azure Managed India', launchDate: '2026-05-01', region: 'IN', conversations: 10 },
    { adSetId: 'as-may-bc-uae-sa', adSetName: 'Business Central — UAE & SA', campaignId: 'camp-bc-uae-sa', campaignName: 'Business Central UAE & SA', launchDate: '2026-05-01', region: 'AE/SA', conversations: 8 },
  ]
  adSets.push(...MAY_AD_SETS.map(({ conversations: _conversations, ...dims }) => dims))

  const facts = []

  // June — the 13 real ad sets, exact figures from the wireframe. { days, startOffset }
  // give each a plausible active window starting on its launchDate through month-end.
  const juneAdSetTotals = [
    { adSetId: 'as-construction-au-11jun', country: 'AU', days: 20, startOffset: 10, spend: 9255.62, impressions: 5368, reach: 2970, clicks: 105, conversations: 22 },
    { adSetId: 'as-bc-3-emirates', country: 'AE', days: 28, startOffset: 2, spend: 4442.18, impressions: 8782, reach: 5846, clicks: 62, conversations: 8 },
    { adSetId: 'as-azure-india-video', country: 'IN', days: 9, startOffset: 21, spend: 4077.38, impressions: 26890, reach: 15930, clicks: 61, conversations: 13 },
    { adSetId: 'as-azure-srilanka-video', country: 'LK', days: 9, startOffset: 21, spend: 4052.15, impressions: 19335, reach: 7753, clicks: 193, conversations: 15 },
    { adSetId: 'as-bc-au-11jun', country: 'AU', days: 20, startOffset: 10, spend: 2799.15, impressions: 1690, reach: 1177, clicks: 27, conversations: 4 },
    { adSetId: 'as-bc-uae-sa', country: 'AE', days: 30, startOffset: 0, spend: 2670.33, impressions: 4237, reach: 2820, clicks: 35, conversations: 8 },
    { adSetId: 'as-construction-au-17jun', country: 'AU', days: 14, startOffset: 16, spend: 2274.80, impressions: 1259, reach: 925, clicks: 30, conversations: 9 },
    // The outlier item 4.2/TAD §10.2 example fires on — 1 conversation at cost 1,923.21 exactly.
    { adSetId: 'as-bc-au-17jun', country: 'AU', days: 14, startOffset: 16, spend: 1923.21, impressions: 958, reach: 779, clicks: 13, conversations: 1 },
    { adSetId: 'as-azure-tn', country: 'IN', days: 30, startOffset: 0, spend: 1866.06, impressions: 10723, reach: 7362, clicks: 57, conversations: 10 },
    { adSetId: 'as-bc-middle-east', country: 'AE', days: 20, startOffset: 10, spend: 1655.91, impressions: 5490, reach: 4112, clicks: 29, conversations: 4 },
    // Spend, zero conversions — item 2.18/4.3's example.
    { adSetId: 'as-bc-au-video-22jun', country: 'AU', days: 9, startOffset: 21, spend: 1615.67, impressions: 902, reach: 783, clicks: 3, conversations: 0 },
    { adSetId: 'as-azure-managed-india', country: 'IN', days: 2, startOffset: 28, spend: 1229.19, impressions: 9842, reach: 7640, clicks: 36, conversations: 7 },
    { adSetId: 'as-bc-au-10jun', country: 'AU', days: 21, startOffset: 9, spend: 561.66, impressions: 347, reach: 295, clicks: 4, conversations: 0 },
  ]

  for (const t of juneAdSetTotals) {
    const spends = splitFloat(t.spend, t.days)
    const impressions = splitInt(t.impressions, t.days)
    const clicks = splitInt(t.clicks, t.days)
    const conversations = splitInt(t.conversations, t.days)
    // Daily split is an approximation (reach isn't additive across days either); the
    // *monthly total per ad set* matches the wireframe exactly, which is what item
    // 2.17's table and the Phase 4 rule-engine fixtures depend on.
    const reach = splitInt(t.reach, t.days)
    for (let d = 0; d < t.days; d++) {
      facts.push({
        date: iso('2026-06-01', t.startOffset + d),
        adSetId: t.adSetId,
        country: t.country,
        spend: spends[d],
        impressions: impressions[d],
        reach: reach[d],
        clicks: clicks[d],
        conversations: conversations[d],
      })
    }
  }

  // May facts — 10 ad sets/campaigns above, spend/impressions split evenly across all
  // 31 days per ad set (splitFloat/splitInt guarantee the exact monthly totals below
  // regardless of daily distribution): spend Σ=31,375.00, impressions Σ=138,000,
  // conversations Σ=178 (from each ad set's `conversations` above, split across days).
  const maySpendSplit = splitFloat(31375, MAY_AD_SETS.length)
  const mayImpressionsSplit = splitInt(138000, MAY_AD_SETS.length)
  const mayReachSplit = splitInt(92000, MAY_AD_SETS.length) // plausible; not reconciled to any headline figure (Overview shows no May reach)
  MAY_AD_SETS.forEach((adSet, i) => {
    const days = 31
    const spends = splitFloat(maySpendSplit[i], days)
    const impressions = splitInt(mayImpressionsSplit[i], days)
    const reach = splitInt(mayReachSplit[i], days)
    const conversations = splitInt(adSet.conversations, days)
    const clicks = splitInt(Math.round(mayImpressionsSplit[i] * 0.007), days) // plausible ~0.7% CTR, not individually reconciled
    for (let d = 0; d < days; d++) {
      facts.push({
        date: iso('2026-05-01', d),
        adSetId: adSet.adSetId,
        country: adSet.region.split('/')[0],
        spend: spends[d],
        impressions: impressions[d],
        reach: reach[d],
        clicks: clicks[d],
        conversations: conversations[d],
      })
    }
  })

  // July — lighter, plausible, not individually reconciled (see header comment).
  for (const [monthStart, days] of [['2026-07-01', 31]]) {
    for (const adSet of ['as-azure-tn', 'as-d365-fo-in', 'as-powerbi-in']) {
      for (let d = 0; d < days; d += 3) {
        facts.push({
          date: iso(monthStart, d),
          adSetId: adSet,
          country: 'IN',
          spend: 250 + (d % 7) * 20,
          impressions: 800 + (d % 5) * 100,
          reach: 500 + (d % 5) * 60,
          clicks: 6 + (d % 4),
          conversations: (d % 6 === 0) ? 1 : 0,
        })
      }
    }
  }

  // June is 100/100 "Perfect score — account fully optimised" per
  // Wireframe/07-adcampaigns-mid2.jpg — not an arbitrary varying score.
  const account = []
  for (const [monthStart, days, score] of [['2026-05-01', 31, 88], ['2026-06-01', 30, 100], ['2026-07-01', 31, 92]]) {
    for (let d = 0; d < days; d++) {
      account.push({ date: iso(monthStart, d), opportunityScore: score, recommendations: [] })
    }
  }

  return {
    schemaVersion: 1,
    meta: { channel: 'meta-ads', ...ENVELOPE_META, syncSource: 'Meta Marketing API', rowCounts: { facts: facts.length } },
    dimensions: { adSets },
    facts,
    account,
  }
}

write('meta-ads.json', buildMetaAds())

// ===========================================================================
// ga4.json
// ===========================================================================
const ALL_COUNTRY_CODES = [
  'IN', 'US', 'GB', 'AU', 'CA', 'DE', 'FR', 'SG', 'AE', 'NL', 'SE', 'CH', 'JP', 'BR', 'ZA',
  'NZ', 'IE', 'ES', 'IT', 'PL', 'BE', 'DK', 'NO', 'FI', 'PT', 'AT', 'CZ', 'HU', 'GR', 'TR',
  'MX', 'AR', 'CL', 'CO', 'PE', 'CN', 'HK', 'TW', 'KR', 'TH', 'VN', 'PH', 'ID', 'MY', 'PK',
  'BD', 'LK', 'NP', 'SA', 'QA', 'KW', 'EG', 'NG', 'KE', 'GH', 'MA', 'IL', 'RU', 'UA', 'RO',
  'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE', 'IS', 'LU', 'CY', 'MT',
]

function buildGa4() {
  const daily = []
  const channels = []
  const sources = []
  const pages = []
  const landingPages = []
  const countries = []
  const devices = []
  const paths = []

  // June — precise, reconciled totals (see header comment).
  // sessions=1720, screenPageViews=2513, engagedSessions=1123, bouncedSessions=597,
  // totalSessionDurationSec = 1720 * 107 = 184040. totalUsers is non-additive — daily
  // values are independently plausible, NOT designed to sum to any headline total.
  const juneSessions = splitInt(1720, 30)
  const junePageviews = splitInt(2513, 30)
  const juneEngaged = splitInt(1123, 30)
  const juneBounced = splitInt(597, 30)
  const juneDuration = splitInt(184040, 30)
  for (let d = 0; d < 30; d++) {
    daily.push({
      date: iso('2026-06-01', d),
      totalUsers: 30 + (d % 11) * 4,
      sessions: juneSessions[d],
      screenPageViews: junePageviews[d],
      engagedSessions: juneEngaged[d],
      bouncedSessions: juneBounced[d],
      totalSessionDurationSec: juneDuration[d],
    })
  }

  // Channel breakdown (item 3.20) — reconciled exactly to the 1720 total.
  const CHANNEL_JUNE = [
    { channelGroup: 'Organic Search', sessions: 929, engaged: 606, bounced: 323 },
    { channelGroup: 'Direct', sessions: 692, engaged: 452, bounced: 240 },
    { channelGroup: 'Organic Social', sessions: 62, engaged: 40, bounced: 22 },
    { channelGroup: 'Referral', sessions: 23, engaged: 15, bounced: 8 },
    { channelGroup: 'AI Assistant', sessions: 5, engaged: 4, bounced: 1 },
    { channelGroup: 'Unassigned', sessions: 9, engaged: 6, bounced: 3 },
  ]
  for (const c of CHANNEL_JUNE) {
    const sessionsSplit = splitInt(c.sessions, 30)
    const engagedSplit = splitInt(c.engaged, 30)
    const bouncedSplit = splitInt(c.bounced, 30)
    for (let d = 0; d < 30; d++) {
      if (sessionsSplit[d] === 0) continue
      channels.push({
        date: iso('2026-06-01', d),
        channelGroup: c.channelGroup,
        sessions: sessionsSplit[d],
        engagedSessions: engagedSplit[d],
        bouncedSessions: bouncedSplit[d],
      })
    }
  }

  // Top sources detail (item 3.21) — exact figures from 03-website-top.jpg's
  // "Traffic sources — top sources detail" table. Bounce rates are derived at
  // render time as bounced/(engaged+bounced), so each row's bounced count is set
  // to produce the wireframe's stated rate: google 271/880 = 30.8%,
  // (direct) 273/692 = 39.5%, bing 13/47 = 27.7%.
  sources.push(
    { date: '2026-06-15', source: 'google', channelGroup: 'Organic Search', sessions: 880, engagedSessions: 609, bouncedSessions: 271 },
    { date: '2026-06-15', source: '(direct)', channelGroup: 'Direct', sessions: 692, engagedSessions: 419, bouncedSessions: 273 },
    { date: '2026-06-15', source: 'bing', channelGroup: 'Organic Search', sessions: 47, engagedSessions: 34, bouncedSessions: 13 },
  )

  // AI-referral sources (item 3.22): 5 sessions total, 80% engaged, 20% bounced.
  // (03-website-bottom.jpg's narrative says "7 AI sessions" while its own channel
  // breakdown says 5 — item 3.22's verify says 5, which is also what the channel
  // table sums to, so 5 is used.)
  sources.push(
    { date: '2026-06-15', source: 'chatgpt.com', channelGroup: 'AI Assistant', sessions: 3, engagedSessions: 3, bouncedSessions: 0 },
    { date: '2026-06-20', source: 'perplexity.ai', channelGroup: 'AI Assistant', sessions: 2, engagedSessions: 1, bouncedSessions: 1 },
  )

  // Top pages (item 3.23) — the five rows visible in 03-website-mid1.jpg with their
  // exact views/users/engaged/bounce-rate/avg-duration, plus the homepage and
  // /careers/ (both named in 03-website-bottom.jpg's narrative: homepage 42.9%
  // bounce, Careers 303 views at 21.2% bounce) and /contact-us/, which item 3.23's
  // verify needs present to check its Conversion page-type tag.
  //
  // A page's sessions are derived at render as engaged + bounced (GA4's bounce is
  // exactly "not engaged"), so `bounced` here is set to reproduce the wireframe's
  // stated bounce rate against its stated engaged count — e.g. /global-clients/
  // 10/(64+10) = 13.5%. `duration` is avgDuration x sessions.
  const PAGE_EXAMPLES = [
    { pagePath: '/', views: 620, users: 480, engaged: 400, bounced: 300, duration: 42000 }, // 42.9% bounce
    { pagePath: '/careers/', views: 303, users: 250, engaged: 193, bounced: 52, duration: 11025 }, // 21.2% bounce
    { pagePath: '/global-clients/', views: 78, users: 62, engaged: 64, bounced: 10, duration: 5550 }, // 13.5%, 1m 15s
    { pagePath: '/blog/', views: 63, users: 22, engaged: 49, bounced: 5, duration: 2916 }, // 9.3%, 54s
    { pagePath: '/solutions/power-bi-consulting/', views: 37, users: 13, engaged: 17, bounced: 2, duration: 7942 }, // 10.5%, 6m 58s
    { pagePath: '/services/full-stack-development/', views: 28, users: 26, engaged: 24, bounced: 4, duration: 952 }, // 14.3%, 34s
    { pagePath: '/solutions/microsoft-dynamics-365-finance-and-operations/', views: 17, users: 11, engaged: 13, bounced: 1, duration: 3248 }, // 7.1%, 3m 52s
    { pagePath: '/contact-us/', views: 95, users: 88, engaged: 80, bounced: 12, duration: 9000 },
    { pagePath: '/about-us/', views: 140, users: 120, engaged: 95, bounced: 45, duration: 12500 },
  ]
  for (const p of PAGE_EXAMPLES) {
    pages.push({
      date: '2026-06-15',
      pagePath: p.pagePath,
      screenPageViews: p.views,
      totalUsers: p.users,
      engagedSessions: p.engaged,
      bouncedSessions: p.bounced,
      totalSessionDurationSec: p.duration,
    })
  }

  // Countries reached (item 3.17): exactly 71 distinct for June. The top 8 carry
  // 03-website-mid1.jpg's exact "Country engagement quality" figures — users,
  // bounce rate and avg. duration. Per-country sessions are derived at render as
  // engaged + bounced, so each row's counts are set to reproduce the wireframe's
  // stated rate (e.g. India 242/(458+242) = 34.6%) and duration
  // (116,200s / 700 sessions = 166s = 2m 46s). The remaining 63 are small filler
  // to reach the 71-country total — this slice is an independent breakdown that
  // needn't sum to `daily[]`'s totals (same ADR-008 reasoning as GSC's).
  const COUNTRY_DETAIL = [
    { country: 'IN', totalUsers: 629, engagedSessions: 458, bouncedSessions: 242, totalSessionDurationSec: 116200 }, // 34.6%, 2m 46s
    { country: 'US', totalUsers: 368, engagedSessions: 269, bouncedSessions: 131, totalSessionDurationSec: 9600 }, // 32.8%, 24s
    { country: 'CN', totalUsers: 57, engagedSessions: 21, bouncedSessions: 43, totalSessionDurationSec: 128 }, // 67.2%, 2s
    { country: 'SG', totalUsers: 23, engagedSessions: 16, bouncedSessions: 9, totalSessionDurationSec: 2225 }, // 36.0%, 1m 29s
    { country: 'AE', totalUsers: 22, engagedSessions: 21, bouncedSessions: 5, totalSessionDurationSec: 2002 }, // 19.2%, 1m 17s
    { country: 'GB', totalUsers: 20, engagedSessions: 20, bouncedSessions: 9, totalSessionDurationSec: 8526 }, // 31.0%, 4m 54s
    { country: 'CA', totalUsers: 19, engagedSessions: 15, bouncedSessions: 6, totalSessionDurationSec: 2352 }, // 28.6%, 1m 52s
    { country: 'AU', totalUsers: 9, engagedSessions: 9, bouncedSessions: 2, totalSessionDurationSec: 1683 }, // 18.2%, 2m 33s
  ]
  for (const c of COUNTRY_DETAIL) {
    countries.push({ date: '2026-06-15', ...c })
  }
  const detailCodes = new Set(COUNTRY_DETAIL.map((c) => c.country))
  const fillerCountries = ALL_COUNTRY_CODES.filter((c) => !detailCodes.has(c)).slice(0, 71 - COUNTRY_DETAIL.length)
  fillerCountries.forEach((country, i) => {
    countries.push({
      date: '2026-06-15',
      country,
      totalUsers: 1 + (i % 4),
      engagedSessions: 1 + (i % 3),
      bouncedSessions: i % 2,
      totalSessionDurationSec: 30 + (i % 5) * 12,
    })
  })

  // Landing pages — entry behaviour (item 3.24), read off 03-website-mid1.jpg's
  // bar lengths. A landing page is a distinct GA4 dimension from a page view
  // (an entry, not a hit), which is why this is its own slice rather than a
  // re-sort of `pages` above.
  landingPages.push(
    { date: '2026-06-15', landingPage: '/', sessions: 760, engagedSessions: 434, bouncedSessions: 326 },
    { date: '2026-06-15', landingPage: '/blog/outsystems-vs-power-apps/', sessions: 230, engagedSessions: 205, bouncedSessions: 25 },
    { date: '2026-06-15', landingPage: '/blog/top-power-apps-examples/', sessions: 215, engagedSessions: 190, bouncedSessions: 25 },
    { date: '2026-06-15', landingPage: '/careers/', sessions: 210, engagedSessions: 165, bouncedSessions: 45 },
    { date: '2026-06-15', landingPage: '/about-us/', sessions: 40, engagedSessions: 28, bouncedSessions: 12 },
    { date: '2026-06-15', landingPage: '/contact-us/', sessions: 35, engagedSessions: 30, bouncedSessions: 5 },
    { date: '2026-06-15', landingPage: '/global-clients/', sessions: 30, engagedSessions: 26, bouncedSessions: 4 },
  )

  // Device split (item 3.24) — 03-website-bottom.jpg: desktop 892 of 1,349 engaged
  // (66.1%), mobile 231 of 378 (61.1%). These sum to 1,727 rather than `daily[]`'s
  // 1,720 sessions; that is the wireframe's own figure and is left as-is, since
  // device slices are independent breakdowns (ADR-008) that GA4 itself does not
  // guarantee will reconcile exactly to the session total.
  devices.push(
    { date: '2026-06-15', device: 'desktop', sessions: 1349, engagedSessions: 892 },
    { date: '2026-06-15', device: 'mobile', sessions: 378, engagedSessions: 231 },
  )

  // User journey example paths (BRD §8.4, item 3.25) — the five paths named in
  // 03-website-bottom.jpg's "User journey — path behaviour" panel.
  paths.push(
    { date: '2026-06-15', step1: '/', step2: '/contact-us/', sessions: 123 },
    { date: '2026-06-15', step1: '/about-us/', step2: '/global-clients/', sessions: 64 },
    { date: '2026-06-15', step1: '/', step2: '/solutions/power-bi-consulting/', sessions: 58 },
    { date: '2026-06-15', step1: '/careers/', step2: '(exit)', sessions: 303 },
    { date: '2026-06-15', step1: '/', step2: '(exit)', sessions: 277 },
  )

  // May — reconciled to Wireframe/08-overview-may2026.jpg and 09-overview-comparemom.jpg
  // (Overview tab, 2026-08-14): sessions Σ=1,619, engagedSessions Σ=1,059 (→ 65.41%
  // engagement, displays "65.4%"), totalSessionDurationSec Σ=184,566 (→ 114.0s avg).
  // bouncedSessions is a plausible complement (sessions − engaged), not itself pinned
  // to a wireframe figure — no May bounce-rate value is named anywhere in Phase 3's items.
  const maySessions = splitInt(1619, 31)
  const mayEngaged = splitInt(1059, 31)
  const mayDuration = splitInt(184566, 31)
  for (let d = 0; d < 31; d++) {
    daily.push({
      date: iso('2026-05-01', d),
      totalUsers: 25 + (d % 9) * 3,
      sessions: maySessions[d],
      screenPageViews: 60 + (d % 10) * 6,
      engagedSessions: mayEngaged[d],
      bouncedSessions: Math.max(0, maySessions[d] - mayEngaged[d]),
      totalSessionDurationSec: mayDuration[d],
    })
    if (d % 5 === 0) {
      channels.push({ date: iso('2026-05-01', d), channelGroup: 'Organic Search', sessions: 20, engagedSessions: 13, bouncedSessions: 7 })
      channels.push({ date: iso('2026-05-01', d), channelGroup: 'Direct', sessions: 15, engagedSessions: 10, bouncedSessions: 5 })
    }
  }

  // July — lighter, plausible (see header comment).
  for (const monthStart of ['2026-07-01']) {
    for (let d = 0; d < 31; d++) {
      daily.push({
        date: iso(monthStart, d),
        totalUsers: 25 + (d % 9) * 3,
        sessions: 40 + (d % 10) * 4,
        screenPageViews: 60 + (d % 10) * 6,
        engagedSessions: 22 + (d % 8) * 3,
        bouncedSessions: 12 + (d % 6) * 2,
        totalSessionDurationSec: (40 + (d % 10) * 4) * 95,
      })
      if (d % 5 === 0) {
        channels.push({ date: iso(monthStart, d), channelGroup: 'Organic Search', sessions: 20, engagedSessions: 13, bouncedSessions: 7 })
        channels.push({ date: iso(monthStart, d), channelGroup: 'Direct', sessions: 15, engagedSessions: 10, bouncedSessions: 5 })
      }
    }
  }

  return {
    schemaVersion: 1,
    meta: { channel: 'ga4', ...ENVELOPE_META, syncSource: 'GA4 Data API', rowCounts: { daily: daily.length } },
    daily,
    channels,
    sources,
    pages,
    landingPages,
    countries,
    devices,
    paths,
  }
}

write('ga4.json', buildGa4())

// ===========================================================================
// gsc.json
// ===========================================================================
function buildGsc() {
  const daily = []
  const queries = []
  const pages = []
  const countries = []
  const devices = []

  // June — precise, reconciled `daily[]` totals (the authoritative headline source,
  // TAD §7.3 — queries/pages/countries/devices are independent breakdowns that
  // needn't sum to the same totals, same reasoning as ADR-008 for GA4).
  // clicks=469, impressions=54744, avgPosition=30.1 => sumPosition = 54744*30.1.
  const juneClicks = splitInt(469, 30)
  const juneImpressions = splitInt(54744, 30)
  const juneSumPosition = splitInt(Math.round(54744 * 30.1), 30)
  for (let d = 0; d < 30; d++) {
    daily.push({
      date: iso('2026-06-01', d),
      clicks: juneClicks[d],
      impressions: juneImpressions[d],
      sumPosition: juneSumPosition[d],
      rows: 60 + (d % 20),
    })
  }

  // Named query examples (Phase 3/4 items reference these specifically).
  queries.push(
    // Brand queries — sum to 427 clicks (91% of 469, item 3.26/3.28).
    { date: '2026-06-15', query: 'technorucs', clicks: 400, impressions: 3000, sumPosition: 4500 },
    { date: '2026-06-15', query: 'technorucs private limited', clicks: 27, impressions: 200, sumPosition: 400 },
    // Non-brand, clicking queries — sum to 42 clicks (the remainder).
    { date: '2026-06-15', query: 'power bi consulting india', clicks: 20, impressions: 300, sumPosition: 2400 },
    { date: '2026-06-15', query: 'dynamics 365 partner india', clicks: 15, impressions: 250, sumPosition: 2500 },
    { date: '2026-06-15', query: 'erp implementation chennai', clicks: 7, impressions: 150, sumPosition: 2250 },
    // Zero-click opportunity queries (item 3.31/4.11 — Critical/High priority examples).
    { date: '2026-06-15', query: 'azure migration consultant', clicks: 0, impressions: 148, sumPosition: Math.round(148 * 61.8) },
    { date: '2026-06-15', query: 'ai tools for digital transformation', clicks: 0, impressions: 24, sumPosition: Math.round(24 * 30.2) },
    // TRD §4.6 illustrative example, carried through unchanged.
    { date: '2026-06-15', query: 'dynamics 365 finance and operations', clicks: 0, impressions: 562, sumPosition: 15852 },
  )

  // Indexed pages (item 3.26): exactly 25 distinct pages for June.
  const PAGE_PATHS = [
    '/', '/about-us/', '/contact-us/', '/careers/', '/blog/d365-fo/',
    '/solutions/power-bi-consulting/', '/solutions/microsoft-dynamics-365-finance-and-operations/',
    '/solutions/azure-migration/', '/solutions/data-analytics/', '/case-studies/',
    '/testimonials/', '/blog/erp-selection-guide/', '/blog/power-bi-vs-tableau/',
    '/services/managed-it/', '/services/cloud-consulting/', '/clients/',
    '/blog/dynamics-365-business-central/', '/blog/azure-cost-optimisation/',
    '/request-a-demo/', '/get-in-touch/', '/blog/erp-implementation-timeline/',
    '/blog/power-platform-overview/', '/solutions/crm-implementation/',
    '/blog/cloud-security-checklist/', '/privacy-policy/',
  ]
  for (const page of PAGE_PATHS) {
    pages.push({ date: '2026-06-15', page, clicks: 5 + (PAGE_PATHS.indexOf(page) % 8), impressions: 100 + PAGE_PATHS.indexOf(page) * 30, sumPosition: (100 + PAGE_PATHS.indexOf(page) * 30) * 25 })
  }

  // Countries reached (item 3.26): exactly 15 distinct.
  const GSC_COUNTRIES = ['IN', 'US', 'GB', 'AU', 'CA', 'DE', 'SG', 'AE', 'NL', 'NZ', 'IE', 'FR', 'JP', 'ZA', 'BR']
  for (const country of GSC_COUNTRIES) {
    const c = 5 + GSC_COUNTRIES.indexOf(country) * 2
    countries.push({ date: '2026-06-15', country, clicks: c, impressions: c * 15, sumPosition: c * 15 * 28 })
  }

  // Device split (item 3.26 — mobile click share 39.8%): mobile=187, desktop=269, tablet=13; sums exactly to 469.
  devices.push(
    { date: '2026-06-15', device: 'DESKTOP', clicks: 269, impressions: 32000, sumPosition: 32000 * 29 },
    { date: '2026-06-15', device: 'MOBILE', clicks: 187, impressions: 21500, sumPosition: 21500 * 32 },
    { date: '2026-06-15', device: 'TABLET', clicks: 13, impressions: 1244, sumPosition: 1244 * 33 },
  )

  // May — reconciled to Wireframe/08-overview-may2026.jpg and 09-overview-comparemom.jpg
  // (Overview tab, 2026-08-14): daily[] clicks Σ=453, impressions Σ=49,596 (the
  // authoritative headline totals — TAD §7.3, same as June). sumPosition kept
  // proportional to a plausible ~32 average position; May's avgPosition isn't pinned
  // to a wireframe figure by any Phase 3 item built so far.
  //
  // queries[] below (pre-existing, unchanged) already independently reconciles:
  // non-brand clicks = Σ(non-brand query clicks) = 108+70+37 = 215, giving
  // (42−215)/215 ≈ −80.5% vs June's 42 — the channel-health/period-comparison
  // "Non-brand clicks" reconciliation (item 3.3/3.5) — without needing daily[] and
  // queries[] to sum to the same total (deliberately independent breakdowns, as the
  // June section's own comment above already establishes for this file).
  const mayClicks = splitInt(453, 31)
  const mayImpressions = splitInt(49596, 31)
  for (let d = 0; d < 31; d++) {
    daily.push({ date: iso('2026-05-01', d), clicks: mayClicks[d], impressions: mayImpressions[d], sumPosition: mayImpressions[d] * 32, rows: 55 })
  }
  queries.push({ date: '2026-05-15', query: 'power bi consulting india', clicks: 108, impressions: 1200, sumPosition: 1200 * 9 })
  queries.push({ date: '2026-05-15', query: 'dynamics 365 partner india', clicks: 70, impressions: 900, sumPosition: 900 * 11 })
  queries.push({ date: '2026-05-15', query: 'erp implementation chennai', clicks: 37, impressions: 500, sumPosition: 500 * 14 }) // May non-brand total: 108+70+37=215

  // July — lighter, plausible (see header comment).
  for (let d = 0; d < 31; d++) {
    daily.push({ date: iso('2026-07-01', d), clicks: 12 + (d % 5), impressions: 1500 + (d % 10) * 50, sumPosition: (1500 + (d % 10) * 50) * 32, rows: 55 })
  }

  return {
    schemaVersion: 1,
    meta: { channel: 'gsc', ...ENVELOPE_META, latestRecordDate: '2026-08-07', syncSource: 'Search Console API', rowCounts: { daily: daily.length } },
    daily,
    queries,
    pages,
    countries,
    devices,
  }
}

write('gsc.json', buildGsc())

// ===========================================================================
// zoho-crm.json
// ===========================================================================
function buildZohoCrm() {
  const leads = []
  let leadIdCounter = 4800

  // June — precise, reconciled cross-tabulation against Wireframe/02-leads-top.jpg
  // and 02-leads-mid.jpg (items 3.7-3.15, built 2026-08-14):
  //   Total 49, Contacted 15, Attempted 27, Lost 7, ContactInFuture 0, Junk 0,
  //   Meetings 0. Meta Ads 48 / SEO 1.
  //   Per rep: Gopinath 43 (12 contacted / 24 attempted / 7 lost → 27.9% contact
  //   rate), Jeevanantham J. 6 (3 contacted / 3 attempted / 0 lost → 50.0%).
  //
  // **Fixture bug found and fixed here (2026-08-14).** The original item 1.20 split
  // gave Gopinath 12 Meta-Contacted + 6 Meta-Lost and named the second rep "Priya",
  // producing Gopinath 13C/6L (30.2% contact rate) and Priya 2C/1L (33.3%) — the
  // *headline* totals (49/15/27/7) were right, so Phase 1's reconciliation never
  // caught it, but every per-rep figure in 02-leads-mid.jpg disagreed. The Leads
  // tab's rep table (item 3.14) is the first thing that ever displayed a per-rep
  // breakdown, which is what surfaced it. The wireframe's own arithmetic pins the
  // correct split exactly: Gopinath 12+24+7=43 and Jeevanantham 3+3+0=6 sum to 49,
  // and the Meta-only donut (27 attempted / 14 contacted / 7 lost of 48) forces the
  // single SEO lead to be one of Gopinath's contacted ones.
  const JUNE_LEADS = [
    // owner, source, status, count
    { owner: 'Gopinath', source: 'Meta Ads', status: 'Attempted to Contact', count: 24 },
    { owner: 'Gopinath', source: 'Meta Ads', status: 'Contacted', count: 11 },
    { owner: 'Gopinath', source: 'Meta Ads', status: 'Lost / Not interested', count: 7 },
    { owner: 'Gopinath', source: 'SEO', status: 'Contacted', count: 1 },
    { owner: 'Jeevanantham J.', source: 'Meta Ads', status: 'Attempted to Contact', count: 3 },
    { owner: 'Jeevanantham J.', source: 'Meta Ads', status: 'Contacted', count: 3 },
  ]

  // Daily distribution (item 3.13) — the 16 active days are read off
  // 02-leads-top.jpg's "Daily inbound volume" x-axis, and Jun 15 is its stated
  // peak at 6 leads. Counts on the other 15 days are plausible readings of the
  // bar heights that sum to exactly 49; they are NOT pixel-verified, and nothing
  // in the checklist pins them individually (item 3.13's verify asks only for
  // "30 day slots, active on 16"). The wireframe's two gap captions disagree with
  // each other ("Jun 3,5-7,13-17…" on the card vs "…19-21,26-28" on the chart), so
  // the x-axis labels are used as the authority rather than either caption.
  const JUNE_DAY_COUNTS = [
    { day: 1, count: 3 }, { day: 2, count: 1 }, { day: 4, count: 2 }, { day: 8, count: 3 },
    { day: 9, count: 2 }, { day: 10, count: 1 }, { day: 11, count: 3 }, { day: 12, count: 3 },
    { day: 15, count: 6 }, { day: 18, count: 5 }, { day: 22, count: 3 }, { day: 23, count: 3 },
    { day: 24, count: 2 }, { day: 25, count: 4 }, { day: 28, count: 5 }, { day: 30, count: 3 },
  ]
  const daySchedule = JUNE_DAY_COUNTS.flatMap(({ day, count }) => Array.from({ length: count }, () => day))

  const juneSpecs = JUNE_LEADS.flatMap((bucket) =>
    Array.from({ length: bucket.count }, () => ({ source: bucket.source, status: bucket.status, owner: bucket.owner })),
  )
  // `daySchedule` is ordered by day, so index 6 is the first Jun 8 slot — the day
  // 02-leads-top.jpg draws the single green (SEO) segment on. Move the one SEO
  // lead there so the stacked chart's SEO bar lands where the wireframe shows it.
  const SEO_TARGET_INDEX = 6
  const seoIndex = juneSpecs.findIndex((s) => s.source === 'SEO')
  juneSpecs.splice(SEO_TARGET_INDEX, 0, ...juneSpecs.splice(seoIndex, 1))

  if (daySchedule.length !== juneSpecs.length) {
    throw new Error(`June day schedule (${daySchedule.length}) must match lead count (${juneSpecs.length})`)
  }

  juneSpecs.forEach((spec, i) => {
    const day = daySchedule[i]
    const hh = String(9 + (leadIdCounter % 8)).padStart(2, '0')
    const mm = String((leadIdCounter * 7) % 60).padStart(2, '0')
    leads.push({
      leadId: String(leadIdCounter++),
      createdTime: `2026-06-${String(day).padStart(2, '0')}T${hh}:${mm}:00+05:30`,
      leadSource: spec.source,
      leadStatus: spec.status,
      owner: spec.owner,
      inquiryType: null,
    })
  })

  // May — reconciled to Wireframe/08-overview-may2026.jpg and 09-overview-comparemom.jpg
  // (Overview tab, 2026-08-14): 64 total leads, 9 Contacted → 9/64 = 14.0625%, which
  // displays as "14.1%" (BRD's 1-decimal rounding) matching both the May channel
  // snapshot and the May→June contact-rate delta (14.1%→30.6%, "+16.5pp" per item 3.6).
  const MAY_TOTAL_LEADS = 64
  const MAY_CONTACTED = 9
  for (let i = 0; i < MAY_TOTAL_LEADS; i++) {
    const day = 1 + (i % 31)
    leads.push({
      leadId: String(leadIdCounter++),
      createdTime: `2026-05-${String(day).padStart(2, '0')}T11:30:00+05:30`,
      leadSource: 'Meta Ads',
      leadStatus: i < MAY_CONTACTED ? 'Contacted' : 'Attempted to Contact',
      owner: i % 5 === 0 ? 'Jeevanantham J.' : 'Gopinath',
      inquiryType: null,
    })
  }

  // July — lighter, plausible (see header comment).
  for (let d = 1; d <= 31; d += 2) {
    leads.push({
      leadId: String(leadIdCounter++),
      createdTime: `2026-07-${String(d).padStart(2, '0')}T11:30:00+05:30`,
      leadSource: 'Meta Ads',
      leadStatus: d % 6 === 0 ? 'Contacted' : 'Attempted to Contact',
      owner: d % 5 === 0 ? 'Jeevanantham J.' : 'Gopinath',
      inquiryType: null,
    })
  }

  return {
    schemaVersion: 1,
    meta: { channel: 'zoho-crm', ...ENVELOPE_META, syncSource: 'Zoho CRM', rowCounts: { leads: leads.length } },
    leads,
  }
}

write('zoho-crm.json', buildZohoCrm())

// ===========================================================================
// linkedin.json
// ===========================================================================
function buildLinkedin() {
  // June — precise, reconciled overview totals (item 3.35): 132 new followers,
  // 2349 page views, 787 unique visitors, 16374 impressions, 2099 clicks, 522
  // reactions, 7 comments (sum of posts[].comments), 9 posts published.
  const dailyTrend = []
  const newFollowersSplit = splitInt(132, 30)
  const pageViewsSplit = splitInt(2349, 30)
  const impressionsSplit = splitInt(16374, 30)
  const clicksSplit = splitInt(2099, 30)
  const reactionsSplit = splitInt(522, 30)
  for (let d = 0; d < 30; d++) {
    dailyTrend.push({
      date: iso('2026-06-01', d),
      newFollowers: newFollowersSplit[d],
      pageViews: pageViewsSplit[d],
      // uniqueVisitors is non-additive — daily values are independently plausible,
      // not designed to sum to 787 (LinkedIn de-duplicates visitors itself).
      uniqueVisitors: 15 + (d % 9) * 3,
      impressions: impressionsSplit[d],
      clicks: clicksSplit[d],
      reactions: reactionsSplit[d],
    })
  }

  // Post performance (item 3.39): 9 posts, top = Chennai Salesforce Meetup
  // (3,353 / 1,385 / 129 / 45.2% engagement / 41.3% CTR). Comments sum to 7.
  const posts = [
    { postId: 'urn:li:activity:1', date: '2026-06-01', title: 'Chennai Salesforce Trailblazer Community Meetup', impressions: 3353, clicks: 1385, reactions: 129, comments: 2, videoViews: null },
    { postId: 'urn:li:activity:2', date: '2026-06-05', title: 'Dynamics 365 Business Central release highlights', impressions: 2100, clicks: 310, reactions: 88, comments: 1, videoViews: null },
    { postId: 'urn:li:activity:3', date: '2026-06-08', title: 'Case study: Azure migration for a Chennai manufacturer', impressions: 1800, clicks: 140, reactions: 64, comments: 1, videoViews: null },
    { postId: 'urn:li:activity:4', date: '2026-06-12', title: 'Power BI dashboard walkthrough (video)', impressions: 2600, clicks: 95, reactions: 71, comments: 0, videoViews: 940 },
    { postId: 'urn:li:activity:5', date: '2026-06-15', title: 'TechnoRUCS at Microsoft Partner Summit', impressions: 1500, clicks: 60, reactions: 42, comments: 1, videoViews: null },
    { postId: 'urn:li:activity:6', date: '2026-06-18', title: 'Hiring: Dynamics 365 Functional Consultant', impressions: 2200, clicks: 8, reactions: 55, comments: 2, videoViews: null },
    { postId: 'urn:li:activity:7', date: '2026-06-21', title: 'Team spotlight: our support desk', impressions: 900, clicks: 4, reactions: 28, comments: 0, videoViews: null },
    { postId: 'urn:li:activity:8', date: '2026-06-24', title: 'ERP selection checklist for SMEs', impressions: 1200, clicks: 90, reactions: 33, comments: 0, videoViews: null },
    { postId: 'urn:li:activity:9', date: '2026-06-27', title: 'Client testimonial: multi-site construction rollout', impressions: 721, clicks: 7, reactions: 12, comments: 0, videoViews: null },
  ]

  const audience = {
    bySeniority: [
      { level: 'Senior', count: 1789 },
      { level: 'Manager', count: 1120 },
      { level: 'Entry', count: 640 },
      { level: 'Director', count: 210 },
      { level: 'Owner', count: 95 },
    ],
    byJobFunction: [
      { function: 'Engineering', count: 1389 },
      { function: 'Information Technology', count: 980 },
      { function: 'Operations', count: 540 },
      { function: 'Sales', count: 410 },
      { function: 'Finance', count: 200 },
    ],
    byVisitorIndustry: [
      { industry: 'IT Services', count: 512 },
      { industry: 'Construction', count: 260 },
      { industry: 'Manufacturing', count: 180 },
      { industry: 'Financial Services', count: 95 },
    ],
    byCompanySize: [
      { companySize: '1-10', count: 120 },
      { companySize: '11-50', count: 210 },
      { companySize: '51-200', count: 300 },
      { companySize: '201-1000', count: 140 },
      { companySize: '1000+', count: 60 },
    ],
  }

  // Competitor comparison (item 3.37/4.12): TechnoRUCS 132/9/7/522 (58.0 reactions/post,
  // derived not stored, P1) vs BytesTechnolab 15/1/0/15 (15.0 reactions/post).
  const competitors = [{ page: 'BytesTechnolab — HR', newFollowers: 15, posts: 1, comments: 0, reactions: 15 }]

  return {
    schemaVersion: 1,
    meta: {
      channel: 'linkedin',
      lastSyncedAt: '2026-07-02T10:00:00+05:30',
      earliestRecordDate: '2026-06-01',
      latestRecordDate: '2026-06-30',
      syncSource: 'Manual XLS upload',
      coworkRunId: 'run_2026-07-02T1000',
      rowCounts: { posts: posts.length },
      // Deliberately June-only (not May-July like the other channels) — LinkedIn's
      // coverage rule (item 1.27) specifically needs a fixture demonstrating
      // "requires-full-coverage" for a range outside the upload window, and
      // fabricating rows for a month with no real upload would misrepresent
      // exactly the rule this fixture exists to exercise.
      uploads: [
        { coversFrom: '2026-06-01', coversTo: '2026-06-30', uploadedAt: '2026-07-02T09:40:00+05:30', fileType: 'followers+visitors+content' },
      ],
    },
    dailyTrend,
    posts,
    audience,
    competitors,
  }
}

write('linkedin.json', buildLinkedin())
