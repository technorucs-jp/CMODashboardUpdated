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
    { adSetId: 'as-bc-au-10jun', country: 'AU', days: 15, startOffset: 0, spend: 4200.0, impressions: 10500, clicks: 68, conversations: 8 },
    { adSetId: 'as-bc-au-11jun', country: 'AU', days: 15, startOffset: 1, spend: 4500.0, impressions: 11200, clicks: 71, conversations: 9 },
    { adSetId: 'as-bc-au-17jun', country: 'AU', days: 14, startOffset: 7, spend: 9616.05, impressions: 18700, clicks: 125, conversations: 5 },
    { adSetId: 'as-bc-au-22jun-video', country: 'AU', days: 9, startOffset: 12, spend: 1616.0, impressions: 6423, clicks: 41, conversations: 0 },
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
