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
 * pixel. May and July are lighter/plausible throughout; only June is fully
 * reconciled here (May/July reconciliation golden files are a Phase 3 task
 * per the original checklist's own phasing).
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
  const adSets = [
    { adSetId: 'as-bc-au-10jun', adSetName: 'Business Central — Australia (10 Jun)', campaignId: 'camp-construction-au', campaignName: 'Construction AU', launchDate: '2026-06-10', region: 'AU' },
    { adSetId: 'as-bc-au-11jun', adSetName: 'Business Central — Australia (11 Jun)', campaignId: 'camp-construction-au', campaignName: 'Construction AU', launchDate: '2026-06-11', region: 'AU' },
    { adSetId: 'as-bc-au-17jun', adSetName: 'Business Central — Australia (17 Jun)', campaignId: 'camp-construction-au', campaignName: 'Construction AU', launchDate: '2026-06-17', region: 'AU' },
    { adSetId: 'as-bc-au-22jun-video', adSetName: 'Business Central — Australia — Video (22 Jun)', campaignId: 'camp-construction-au', campaignName: 'Construction AU', launchDate: '2026-06-22', region: 'AU' },
    { adSetId: 'as-azure-tn', adSetName: 'Azure Migration — Tamil Nadu', campaignId: 'camp-azure-tn', campaignName: 'Azure Migration TN', launchDate: '2026-05-05', region: 'IN' },
    { adSetId: 'as-d365-fo-in', adSetName: 'Dynamics 365 F&O — India', campaignId: 'camp-d365-in', campaignName: 'Dynamics 365 India', launchDate: '2026-05-01', region: 'IN' },
    { adSetId: 'as-powerbi-in', adSetName: 'Power BI Consulting — India', campaignId: 'camp-powerbi', campaignName: 'Power BI Consulting', launchDate: '2026-05-12', region: 'IN' },
  ]

  const facts = []

  // June — precise, reconciled ad-set totals (see header comment).
  const juneAdSetTotals = [
    // startOffset aligns each ad set's first fact row with its declared launchDate above
    // (offset 0 = 2026-06-01) — a launchDate with fact rows predating it would be a data
    // integrity bug (caught by metaAds.test.ts while building item 1.22).
    { adSetId: 'as-bc-au-10jun', country: 'AU', days: 15, startOffset: 9, spend: 4200.0, impressions: 10500, clicks: 68, conversations: 8 },
    { adSetId: 'as-bc-au-11jun', country: 'AU', days: 15, startOffset: 10, spend: 4500.0, impressions: 11200, clicks: 71, conversations: 9 },
    { adSetId: 'as-bc-au-17jun', country: 'AU', days: 14, startOffset: 16, spend: 9616.05, impressions: 18700, clicks: 125, conversations: 5 },
    { adSetId: 'as-bc-au-22jun-video', country: 'AU', days: 9, startOffset: 21, spend: 1616.0, impressions: 6423, clicks: 41, conversations: 0 },
    { adSetId: 'as-azure-tn', country: 'IN', days: 30, startOffset: 0, spend: 3348.0, impressions: 15000, clicks: 95, conversations: 18 },
    { adSetId: 'as-d365-fo-in', country: 'IN', days: 30, startOffset: 0, spend: 9143.26, impressions: 20000, clicks: 150, conversations: 38 },
    { adSetId: 'as-powerbi-in', country: 'IN', days: 30, startOffset: 0, spend: 6000.0, impressions: 14000, clicks: 105, conversations: 23 },
  ]

  for (const t of juneAdSetTotals) {
    const spends = splitFloat(t.spend, t.days)
    const impressions = splitInt(t.impressions, t.days)
    const clicks = splitInt(t.clicks, t.days)
    const conversations = splitInt(t.conversations, t.days)
    const reach = impressions.map((i) => Math.round(i * 0.55)) // plausible, non-additive by design (not reconciled to a stored total)
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

  // May and July — lighter, plausible, not individually reconciled (see header comment).
  for (const [monthStart, days] of [['2026-05-01', 31], ['2026-07-01', 31]]) {
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

  const account = []
  for (const [monthStart, days] of [['2026-05-01', 31], ['2026-06-01', 30], ['2026-07-01', 31]]) {
    for (let d = 0; d < days; d++) {
      account.push({ date: iso(monthStart, d), opportunityScore: 82 + (d % 15), recommendations: [] })
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

  // AI-referral sources (item 3.22): 5 sessions total, 80% engaged, 20% bounced.
  sources.push(
    { date: '2026-06-15', source: 'chatgpt.com', channelGroup: 'AI Assistant', sessions: 3, engagedSessions: 3, bouncedSessions: 0 },
    { date: '2026-06-20', source: 'perplexity.ai', channelGroup: 'AI Assistant', sessions: 2, engagedSessions: 1, bouncedSessions: 1 },
  )

  // Top pages (item 3.23) — page-type tagging examples, not reconciled to daily totals.
  const PAGE_EXAMPLES = [
    { pagePath: '/', views: 620, users: 480, engaged: 410, bounced: 180, duration: 55000 },
    { pagePath: '/solutions/power-bi-consulting/', views: 210, users: 160, engaged: 140, bounced: 55, duration: 22000 },
    { pagePath: '/contact-us/', views: 95, users: 88, engaged: 80, bounced: 12, duration: 9000 },
    { pagePath: '/careers/', views: 130, users: 110, engaged: 90, bounced: 40, duration: 11000 },
    { pagePath: '/about-us/', views: 140, users: 120, engaged: 95, bounced: 45, duration: 12500 },
    { pagePath: '/blog/d365-fo/', views: 180, users: 150, engaged: 120, bounced: 60, duration: 17000 },
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

  // Countries reached (item 3.26): exactly 71 distinct for June.
  const juneCountries = ALL_COUNTRY_CODES.slice(0, 71)
  const countrySessionSplit = splitInt(1720, juneCountries.length)
  const countryBouncedSplit = splitInt(597, juneCountries.length)
  const countryDurationSplit = splitInt(184040, juneCountries.length)
  juneCountries.forEach((country, i) => {
    countries.push({
      date: '2026-06-15',
      country,
      totalUsers: Math.max(1, Math.round(countrySessionSplit[i] * 0.8)),
      bouncedSessions: countryBouncedSplit[i],
      totalSessionDurationSec: countryDurationSplit[i],
    })
  })

  // Device split — plausible, not separately reconciled beyond schema validity.
  devices.push(
    { date: '2026-06-15', device: 'desktop', sessions: 1180, engagedSessions: 780 },
    { date: '2026-06-15', device: 'mobile', sessions: 540, engagedSessions: 343 },
  )

  // User journey example paths (BRD §8.4).
  paths.push(
    { date: '2026-06-15', step1: '/', step2: '/contact-us/', sessions: 45 },
    { date: '2026-06-15', step1: '/about-us/', step2: '/clients/', sessions: 22 },
  )

  // May and July — lighter, plausible (see header comment).
  for (const monthStart of ['2026-05-01', '2026-07-01']) {
    const days = monthStart === '2026-05-01' ? 31 : 31
    for (let d = 0; d < days; d++) {
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

  // May and July — lighter, plausible (see header comment). May's non-brand clicks
  // are set so the channel-health "-80.5%" reconciliation (item 3.3/4.13) holds:
  // May non-brand ≈ 215, June non-brand = 42 → (42-215)/215 ≈ -80.5%.
  for (const monthStart of ['2026-05-01', '2026-07-01']) {
    for (let d = 0; d < 31; d++) {
      daily.push({ date: iso(monthStart, d), clicks: 12 + (d % 5), impressions: 1500 + (d % 10) * 50, sumPosition: (1500 + (d % 10) * 50) * 32, rows: 55 })
    }
  }
  queries.push({ date: '2026-05-15', query: 'power bi consulting india', clicks: 108, impressions: 1200, sumPosition: 1200 * 9 })
  queries.push({ date: '2026-05-15', query: 'dynamics 365 partner india', clicks: 70, impressions: 900, sumPosition: 900 * 11 })
  queries.push({ date: '2026-05-15', query: 'erp implementation chennai', clicks: 37, impressions: 500, sumPosition: 500 * 14 }) // May non-brand total: 108+70+37=215

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

  // June — precise, reconciled cross-tabulation (see header comment):
  //   Total 49, Contacted 15, Attempted 27, Lost 7, ContactInFuture 0, Junk 0,
  //   Meetings 0. Meta Ads 48 / SEO 1. Gopinath 43 (incl. the 1 SEO lead,
  //   Contacted), Priya 6.
  const JUNE_LEADS = [
    // owner, source, status, count
    { owner: 'Gopinath', source: 'Meta Ads', status: 'Attempted to Contact', count: 24 },
    { owner: 'Gopinath', source: 'Meta Ads', status: 'Contacted', count: 12 },
    { owner: 'Gopinath', source: 'Meta Ads', status: 'Lost / Not interested', count: 6 },
    { owner: 'Gopinath', source: 'SEO', status: 'Contacted', count: 1 },
    { owner: 'Priya', source: 'Meta Ads', status: 'Attempted to Contact', count: 3 },
    { owner: 'Priya', source: 'Meta Ads', status: 'Contacted', count: 2 },
    { owner: 'Priya', source: 'Meta Ads', status: 'Lost / Not interested', count: 1 },
  ]
  // 16 distinct active days in June (item 3.13).
  const ACTIVE_JUNE_DAYS = [1, 2, 3, 5, 6, 8, 9, 11, 13, 16, 18, 20, 22, 25, 27, 29]
  let dayCursor = 0
  for (const bucket of JUNE_LEADS) {
    for (let i = 0; i < bucket.count; i++) {
      const day = ACTIVE_JUNE_DAYS[dayCursor % ACTIVE_JUNE_DAYS.length]
      dayCursor++
      const hh = String(9 + (leadIdCounter % 8)).padStart(2, '0')
      const mm = String((leadIdCounter * 7) % 60).padStart(2, '0')
      leads.push({
        leadId: String(leadIdCounter++),
        createdTime: `2026-06-${String(day).padStart(2, '0')}T${hh}:${mm}:00+05:30`,
        leadSource: bucket.source,
        leadStatus: bucket.status,
        owner: bucket.owner,
        inquiryType: null,
      })
    }
  }

  // May and July — lighter, plausible (see header comment).
  for (const [monthStart, days] of [['2026-05-01', 31], ['2026-07-01', 31]]) {
    for (let d = 1; d <= days; d += 2) {
      leads.push({
        leadId: String(leadIdCounter++),
        createdTime: `${monthStart.slice(0, 7)}-${String(d).padStart(2, '0')}T11:30:00+05:30`,
        leadSource: 'Meta Ads',
        leadStatus: d % 6 === 0 ? 'Contacted' : 'Attempted to Contact',
        owner: d % 5 === 0 ? 'Priya' : 'Gopinath',
        inquiryType: null,
      })
    }
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
