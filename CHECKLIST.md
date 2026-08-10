# CHECKLIST — TechnoRUCS CMO Dashboard

Companion to `TASK.md`. **Read `TASK.md` first.** Work top to bottom, one item at a time.

**Rules for using this file**

- Mark `[x]` **only after** the item's `Verify:` command passes. A checkbox is a claim about reality, not about intent.
- Commit after each item (`<phase>.<item> <what changed>`).
- Update the *Session state* block below before you stop working, for any reason.
- On resume: re-run the last `[x]` item's Verify before trusting it. See `TASK.md` §0.
- Do not start a phase while the previous phase's gate is red.
- `[!]` marks an item blocked on a decision — see `TASK.md` §8. Leave it `[!]`, note the blocker, and continue past it if the rest of the phase can proceed.

---

## Session state — update before you stop

```
Current phase:        0 — not started
Last completed item:  —
Next item:            0.1
Blocked on:           —
Notes:                —
Last updated:         —
```

---

## Progress

| Phase | Items | Done | Gate |
|---|---|---|---|
| 0 — Foundation | 18 | 0 | ⬜ |
| 1 — Data spine | 31 | 0 | ⬜ |
| 2 — Pickers & first tab | 24 | 0 | ⬜ |
| 3 — Remaining tabs | 44 | 0 | ⬜ |
| 4 — Rules & narrative | 19 | 0 | ⬜ |
| 5 — Ingestion & hardening | 26 | 0 | ⬜ |

---

# Phase 0 — Foundation

*Goal: only an authenticated `@technorucs.com` user can reach any route, and all eight tabs navigate.*
*Read first: TAD §5, §6, §11.1, §11.7, ADR-001, ADR-005.*

- [ ] **0.1** Scaffold Next.js 15 App Router project, TypeScript `strict: true`, path alias `@/*` → `src/*`.
  *Verify:* `npm run dev` serves a page; `npx tsc --noEmit` exits 0.

- [ ] **0.2** Install runtime deps: `next-auth@5`, `zod`, `@tanstack/react-query`, `recharts`, `react-day-picker`, `date-fns`.
  *Verify:* `npm ls next-auth zod @tanstack/react-query recharts react-day-picker date-fns` resolves all six with no `UNMET`.

- [ ] **0.3** Install dev deps: `vitest`, `ajv`, `zod-to-json-schema`, `xlsx`, ESLint + TS plugin.
  *Verify:* `npm ls vitest ajv zod-to-json-schema xlsx` resolves all four.

- [ ] **0.4** Add npm scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `test:recon`, `validate:data`, `schemas:build`, `scan:secrets`.
  *Verify:* `npm run typecheck && npm run lint` both exit 0.

- [ ] **0.5** ESLint rule enforcing **P5**: ban `new Date(` and `Date.parse(` outside `src/lib/time/**`.
  *Verify:* add `const d = new Date('2026-01-01')` to a scratch file in `src/lib/metrics/` → `npm run lint` fails. Remove it → passes.

- [ ] **0.6** ESLint rule enforcing **P6**: `src/lib/**` may not import `src/server/**`, `src/app/**`, `src/components/**`, or `react`.
  *Verify:* add `import { useState } from 'react'` to a file in `src/lib/` → `npm run lint` fails. Remove it → passes.

- [ ] **0.7** `next.config.ts` with `outputFileTracingIncludes` for `/api/metrics/[tab]` and `/api/health/data` → `./data/**/*.json`.
  *Verify:* `grep -A4 outputFileTracingIncludes next.config.ts` shows both entries. (Omitting this works locally and 500s in production — TAD ADR-005.)

- [ ] **0.8** Create `data/` at **repo root** with a `.gitkeep` and `data/config/`. Add a comment header in `data/README.md` stating it must never move to `/public`.
  *Verify:* `test -d data && test ! -d public/data` exits 0.

- [ ] **0.9** Extract design tokens from the wireframe into `src/styles/tokens.css`: base `#0d1117`, surface/border/text neutrals, status colours (Leading, Good, Monitor, Action needed), channel accent hues.
  *Verify:* `grep -c '^\s*--' src/styles/tokens.css` ≥ 15; no literal hex values in any component file (`grep -rn '#[0-9a-fA-F]\{6\}' src/components/` returns nothing).

- [ ] **0.10** Auth.js v5 config: Microsoft Entra ID provider, JWT session strategy, **no database adapter**, 8-hour rolling session.
  *Verify:* `src/auth.ts` exports `handlers`, `auth`, `signIn`, `signOut`; `session.strategy === 'jwt'`; no adapter import.

- [ ] **0.11** `signIn` callback: reject any account whose verified email domain ≠ `AUTH_ALLOWED_DOMAIN`, and (if `AUTH_ALLOWED_EMAILS` is non-empty) not on the allowlist.
  *Verify:* unit test — callback returns `false` for `x@gmail.com`, `true` for `x@technorucs.com`.

- [ ] **0.12** `src/middleware.ts` with matcher `['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)']`.
  *Verify:* with dev server running, `curl -sI localhost:3000/overview` returns a 3xx to `/login`; `curl -sI localhost:3000/api/metrics/leads` returns 3xx or 401 — **not** 200.

- [ ] **0.13** `/login` page with a single "Sign in with Microsoft" action. No anonymous data surface.
  *Verify:* `curl -s localhost:3000/login` returns 200 and contains no metric values.

- [ ] **0.14** `(dashboard)` route group layout with `Sidebar` (8 items + source sublabels: Meta, Zoho, GA4, GSC, Instantly, Page, Meta) and `TopBar` shell. Mounted once so state survives navigation.
  *Verify:* navigating between two tabs does not remount the sidebar (React DevTools, or a `console.count` in a `useEffect` with `[]` deps fires once).

- [ ] **0.15** All eight routes exist and render a placeholder: `/overview`, `/ad-campaigns`, `/leads`, `/website`, `/seo`, `/email`, `/linkedin`, `/total-leads`. `/` redirects to `/overview`.
  *Verify:* each of the eight returns 200 when authenticated; `/` returns a redirect.

- [ ] **0.16** `scripts/scan-secrets.mjs` — scans `data/` and `src/` for bearer tokens, `AKIA`, PEM headers, `client_secret`, long base64 blobs. Exits non-zero on match.
  *Verify:* `npm run scan:secrets` exits 0; add `client_secret=abc123def456` to a scratch file → exits 1. Remove it.

- [ ] **0.17** GitHub Actions CI: `typecheck`, `lint`, `test`, `scan:secrets` on every PR.
  *Verify:* `.github/workflows/ci.yml` exists and lists all four steps.

- [ ] **0.18** Commit and push. Confirm Vercel preview deploys and gates on auth.
  *Verify:* preview URL redirects an anonymous visitor to `/login`.

**Phase 0 gate:** `npm run typecheck && npm run lint && npm run scan:secrets && npm run build` — all green, and an anonymous request to `/overview` on the preview deployment does not return dashboard HTML.

---

# Phase 1 — Data spine

*Goal: metric unit tests and the June 2026 reconciliation test pass against fixtures — before a single chart exists.*
*Read first: TAD §7 (schemas), §9 (computation core), ADR-007, ADR-008, ADR-009, and TASK.md §9 (traps).*

### Schemas and config

- [ ] **1.1** `data/config/` seed files: `brand-terms.json` (technorucs + misspellings), `page-types.json` (path → Landing/Blog/Service/Conversion/Trust/Talent/About/Trust), `linkedin-competitors.json`, `thresholds.json` (BRD Appendix A), `sales-reps.json` (active roster).
  *Verify:* all five parse as JSON; `thresholds.json` contains `leading`, `good`, `monitor`, `actionNeeded`.

- [ ] **1.2** Zod schema for the common envelope: `schemaVersion`, `meta` (`channel`, `lastSyncedAt`, `earliestRecordDate`, `latestRecordDate`, `syncSource`, `coworkRunId`, `rowCounts`).
  *Verify:* unit test — a file missing `meta.latestRecordDate` fails parse with a readable error.

- [ ] **1.3** Zod schema `meta-ads.json`: `dimensions.adSets[]` + `facts[]` + `account[]`. **No `cpc`/`cpm`/`ctr`/`frequency` fields** (P1, TAD §7.3).
  *Verify:* unit test — a fact row containing `cpc` fails strict parse.

- [ ] **1.4** Zod schema `zoho-crm.json`: one row per lead, `inquiryType` nullable, `notes` present.
  *Verify:* unit test — a row with `leadSource: "Partner"` fails validation (excluded at ingestion, must never appear).

- [ ] **1.5** Zod schema `ga4.json`: dimension slices `daily[] channels[] sources[] pages[] countries[] devices[] paths[]`. Counts not rates — `bouncedSessions`, `totalSessionDurationSec`.
  *Verify:* unit test — a `daily` row with `bounceRate` fails strict parse.

- [ ] **1.6** Zod schema `gsc.json`: slices `daily[] queries[] pages[] countries[] devices[]`, with `sumPosition` not `position`.
  *Verify:* unit test — a row with `position` fails strict parse.

- [ ] **1.7** Zod schema `linkedin.json`: `meta.uploads[]` coverage windows, `dailyTrend[]`, `posts[]`, `audience`, `competitors[]`. Counts only in `dailyTrend` — no stored `engagementRate`.
  *Verify:* unit test — `meta.uploads[]` with `coversFrom > coversTo` fails validation.

- [ ] **1.8** Zod schema `narratives.json`: `phrasings` keyed by flag ID, each with `headline`, `body`, `tier`.
  *Verify:* unit test — a phrasing keyed by a date-range signature fails the flag-ID key pattern.

- [ ] **1.9** `scripts/build-schemas.mjs` generating `/schemas/*.schema.json` from the Zod schemas.
  *Verify:* `npm run schemas:build` produces six files in `schemas/`; re-running produces no diff.

### Time

- [ ] **1.10** `src/lib/time/businessDate.ts` — `toBusinessDate(input): BusinessDate` ('YYYY-MM-DD' in Asia/Kolkata). The only date parser in the codebase.
  *Verify:* test — `toBusinessDate('2026-06-01T00:15:00+05:30') === '2026-06-01'`; `toBusinessDate('2026-05-31T23:45:00+05:30') === '2026-05-31'`; a UTC-midnight input maps to the correct IST day.

- [ ] **1.11** `src/lib/time/range.ts` — `DateRange`, inclusive containment, length in days, range signature, previous-period-of-equal-length.
  *Verify:* test — 1–30 June has length 30; previous period is 2–31 May.

- [ ] **1.12** `src/lib/time/presets.ts` — the seven presets, computed against IST today.
  *Verify:* test with a frozen clock — "This Month" on 2026-08-10 IST returns 2026-08-01..2026-08-10.

### Metrics core

- [ ] **1.13** `src/lib/metrics/ratio.ts` — `Ratio {n,d}`, `ratio()`, `sumRatios()`, `resolve()` returning `null` when `d === 0`. No arithmetic operators exposed on `Ratio`.
  *Verify:* test — `resolve(ratio(5, 0)) === null` (not 0, not Infinity, not NaN).

- [ ] **1.14** **Ratio invariant test** — for a 3-day fixture, the range CTR computed as `Σclicks/Σimpressions` differs from the mean of daily CTRs, and the engine returns the former.
  *Verify:* test asserts both the correct value and that it is *not* equal to the naive daily mean.

- [ ] **1.15** `src/lib/metrics/registry.ts` — every metric with `id`, `label`, `unit`, `polarity` (`higher-better`/`lower-better`/`neutral`), `additive`, `format`. Mark `reach` and `totalUsers` `additive: false`.
  *Verify:* test — `registry['meta.costPerConversation'].polarity === 'lower-better'`; `registry['ga4.totalUsers'].additive === false`.

- [ ] **1.16** `src/lib/metrics/aggregate.ts` — sum additive metrics over filtered rows; **throw** on an attempt to sum a non-additive metric across >1 day.
  *Verify:* test — summing `reach` over a 2-day range throws; over a 1-day range returns the value.

- [ ] **1.17** `src/lib/metrics/compare.ts` — `Delta` with `pct`, `direction`, `favourable`. Flat band `|pct| ≤ 2%`. `pct === null` when comparison is 0 and current is not.
  *Verify:* test — 100→101 is `flat`; 100→0 is `down` with `pct === -100`; 0→50 has `pct === null` (renders "new", not `∞%`).

- [ ] **1.18** `src/lib/metrics/status.ts` — Appendix A thresholds from `config/thresholds.json`, using registry polarity.
  *Verify:* test — cost/conversation +116% → `action-needed`; sessions +6% → `leading`; engagement rate 65.3% flat → `good`.

- [ ] **1.19** `src/lib/coverage/coverage.ts` — the `Coverage` union (`full`, `partial`, `none`, `lagging`, `requires-full-coverage`, `not-connected`) and `ChannelResult<T>` where `data` is `null` for every non-renderable kind.
  *Verify:* test — a range entirely before `earliestRecordDate` yields `{kind:'none'}` with `data: null`.

### Fixtures and loader

- [ ] **1.20** `tests/fixtures/` — realistic fixture for every channel covering May–July 2026, with hand-calculable totals. Derive values from the wireframe screens so reconciliation is meaningful.
  *Verify:* every fixture passes its Zod schema; `npm run validate:data -- tests/fixtures` exits 0.

- [ ] **1.21** `src/server/data/loader.ts` — `load(channel)`: `fs.readFile` → Zod parse → per-instance cache. Isolates failure to one channel.
  *Verify:* test — a corrupt `gsc.json` fixture makes `load('gsc')` throw a typed error while `load('ga4')` still succeeds.

- [ ] **1.22** Channel query modules `src/lib/channels/{metaAds,zoho,ga4,gsc,linkedin}.ts` — filter by range, return `ChannelResult` with coverage.
  *Verify:* test per channel — filtering to a known range returns hand-calculated totals.

- [ ] **1.23** Zoho date bucketing uses `toBusinessDate(createdTime)`, not the raw string.
  *Verify:* test — a lead at `2026-06-01T00:15:00+05:30` is in a 1–30 June range and not in a 1–31 May range.

- [ ] **1.24** Zoho excludes Partner / Referral / ZoomInfo defensively at query time (belt and braces — ingestion already excludes them).
  *Verify:* test — a fixture deliberately containing a Partner lead is excluded from every count.

- [ ] **1.25** GSC average position computed as `Σ sumPosition ÷ Σ impressions`.
  *Verify:* test — a 2-day fixture where the impression-weighted average differs from the daily mean; assert the weighted value.

- [ ] **1.26** GA4 bounce rate and avg. session duration computed from summed counts.
  *Verify:* test — range bounce rate ≠ mean of daily bounce rates; assert `Σbounced/Σsessions`.

- [ ] **1.27** LinkedIn coverage rule: a range is servable only if fully inside the union of `meta.uploads[]` intervals; partial overlap yields `requires-full-coverage` with the gaps listed.
  *Verify:* test — range 15 Jun–15 Jul against a June-only upload returns `requires-full-coverage` with gap 1–15 Jul.

### API skeleton

- [ ] **1.28** `GET /api/metrics/[tab]` — auth check, Zod-validated query params, `ETag` = `${VERCEL_GIT_COMMIT_SHA}:${tab}:${rangeSig}`, `Cache-Control: private, no-cache`, 304 on `If-None-Match`.
  *Verify:* two identical authenticated requests — the second returns 304 with an empty body.

- [ ] **1.29** Invalid/missing query params fall back to current month to date rather than erroring.
  *Verify:* `GET /api/metrics/leads` with no params returns 200 for the current month.

- [ ] **1.30** Aggregate memoisation keyed on `sha:tab:rangeSig`.
  *Verify:* instrument the aggregation step; a repeated identical request skips it.

- [ ] **1.31** **Reconciliation harness** — `tests/reconciliation/june-2026.golden.json` with the published June figures (₹38,423 spend, 101 conversations, ₹380 cost/conv, 1,720 sessions, 65.3% engagement, 469 clicks, 54,744 impressions, 0.81% CTR, 132 new followers, 522 reactions, 49 inbound leads, 30.6% contact rate). Test selects 1–30 June and asserts within ±1%.
  *Verify:* `npm run test:recon` green.

**Phase 1 gate:** `npm test && npm run test:recon && npm run validate:data` — all green. The engine is correct before any UI exists.

---

# Phase 2 — Pickers and the first tab

*Goal: selecting any custom range recomputes every figure on Ad Campaigns, and the URL round-trips.*
*Read first: TAD §11.3–11.6, BRD §4, §6, wireframes `07-adcampaigns-*.jpg`.*

- [ ] **2.1** `DateRangePicker` — calendar + the seven presets, IST-based.
  *Verify:* selecting "Last Month" on 2026-08-10 sets `from=2026-07-01&to=2026-07-31`.

- [ ] **2.2** `ComparisonRangePicker` — off by default; options previous period / previous month / previous year / custom.
  *Verify:* enabling "previous period" for 1–30 June sets `cf=2026-05-02&ct=2026-05-31`.

- [ ] **2.3** URL parse/serialise with Zod validation; URL is the only range state.
  *Verify:* `grep -rn "useState.*[Rr]ange" src/` returns nothing outside the picker's transient input state.

- [ ] **2.4** Both pickers live in `TopBar`, visible on every tab, surviving navigation.
  *Verify:* set a range on `/leads`, navigate to `/seo` — the range persists and the URL carries it.

- [ ] **2.5** Bookmark/share works: pasting a full URL into a new tab reproduces the exact view.
  *Verify:* manual — copy URL, open in a fresh session, same figures render.

- [ ] **2.6** TanStack Query provider, key `['metrics', tab, rangeSig, compareSig]`, `staleTime: Infinity`.
  *Verify:* switching away and back to a tab issues no second network request.

- [ ] **2.7** Idle prefetch of the other seven tabs for the current range after first paint.
  *Verify:* network panel shows seven prefetches after `/ad-campaigns` settles; a tab switch issues none.

- [ ] **2.8** `CardSkeleton` shown per card during fetch — not a full-page spinner. Sidebar and pickers stay interactive.
  *Verify:* throttle the network; the shell remains usable while cards are skeletons.

- [ ] **2.9** `KpiCard` — primary value + supporting detail lines, channel accent, `tabular-nums`.
  *Verify:* renders the Ad Spend card matching `07-adcampaigns-top.jpg`.

- [ ] **2.10** `StatusTag` — Leading / Good / Monitor / Action needed, colour **and** text label.
  *Verify:* all four variants render; label text is present, not colour-only.

- [ ] **2.11** `DataTable` — sortable columns, totals row, `tabular-nums`, `overflow-x: auto` container.
  *Verify:* the ad-set table sorts by spend and by cost/conv; the page body never scrolls horizontally at 1280px.

- [ ] **2.12** `BarRow` (horizontal labelled bar with value + share) matching the wireframe's inbound-sources / channel-breakdown rows.
  *Verify:* visual match against `02-leads-top.jpg`.

- [ ] **2.13** `DonutChart` and `HorizontalBarChart`, colours from CSS tokens.
  *Verify:* `grep -rn "fill=\"#" src/components/` returns nothing.

- [ ] **2.14** `src/server/viewmodels/adCampaigns.ts` — composes the Ad Campaigns view model.
  *Verify:* contract test — the returned object matches the published TS type; contains no raw fact rows.

- [ ] **2.15** Account overview cards: spend, impressions, reach, clicks, conversations, avg. CPC, CPM, frequency, cost/conversation. All ratios computed for the range.
  *Verify:* 1–30 June returns ₹38,423 / 95,823 / 655 / 101 / ₹58.66 / ₹401 / 1.82× / ₹380 within ±1%.

- [ ] **2.16** `reach` renders "n/a for multi-day ranges" (or the platform figure) rather than a summed value.
  *Verify:* a 2-day range does not display the arithmetic sum of two daily reach values.

- [ ] **2.17** Ad set breakdown table with totals row: name, launch date, region, spend, impressions, clicks, CTR, CPC, CPM, reach, conversations, cost/conv.
  *Verify:* matches `07-adcampaigns-top.jpg` for June; totals row reads 38,423 / 95,823 / 655 / 0.68%.

- [ ] **2.18** Ad sets with zero conversations show `—` for cost/conversation, never `0` or `∞`.
  *Verify:* "BC Australia — Video" (₹1,616 spend, 0 conversations) renders `—`.

- [ ] **2.19** Spend-by-country donut + region performance detail table (spend, impressions, clicks, reach, CTR, % of budget).
  *Verify:* June totals by country match `07-adcampaigns-mid1.jpg`; % of budget sums to 100.

- [ ] **2.20** Conversations-by-ad-set bar chart.
  *Verify:* bar order and values match the wireframe for June.

- [ ] **2.21** Cost-per-conversation by ad set bar chart with an account-average reference line.
  *Verify:* reference line sits at the range's account average, recomputed on range change.

- [ ] **2.22** Account opportunity score panel + rule-generated suggestion list placeholder (real rules land in Phase 4).
  *Verify:* score renders from `meta-ads.json` `account[]`.

- [ ] **2.23** Empty/partial states wired on this tab via `Coverage`.
  *Verify:* selecting 1–30 April 2026 (before history) renders "no data before 2026-05-01", not zeros.

- [ ] **2.24** Performance instrumentation: `performance.mark` around aggregation; log p95.
  *Verify:* a 12-month range change completes well inside the 3-second ceiling; record the measured number in the Session state notes.

**Phase 2 gate:** pick three arbitrary ranges (including one crossing a month boundary and one single day). Every figure on `/ad-campaigns` recomputes, no zeros stand in for absent data, and the URL reproduces each view.

---

# Phase 3 — Remaining tabs

*Goal: BRD §16 criteria 1–5 pass; reconciliation green for May, June, and July.*
*Read first: BRD §5, §7–§12; wireframes for each tab.*

### Shared state components

- [ ] **3.1** `EmptyState`, `NoDataBeforeDate`, `PartialDataWarning`, `LaggingDataNotice`, `NotConnectedPanel` — used by every tab, never reimplemented per tab.
  *Verify:* each renders from a `Coverage` value; `grep -rn "No data" src/app/` returns nothing (copy lives in the shared components).

### Overview

- [ ] **3.2** Six KPI cards: Ad Spend, Total Leads, Sessions, Organic Clicks, New Followers, Meta Conversations — each with its supporting detail line.
  *Verify:* June matches `01-overview-june-b.jpg` within ±1%.

- [ ] **3.3** Channel health table: channel, source, key metric, value, % vs. comparison, status tag. Fixed channel list.
  *Verify:* June vs. May reproduces `01-overview-june-b.jpg`: cost/conv +115.9% Monitor, conversations −43.3% Monitor, engagement ≈flat Good, non-brand clicks −80.5% Action needed, reactions/post +216% Leading.

- [ ] **3.4** When comparison is off, the health table falls back to the previous period of equal length and **labels it explicitly**.
  *Verify:* the header reads "vs. previous 30 days" (or equivalent), never an unlabelled comparison.

- [ ] **3.5** Three period-comparison blocks: Meta Ads; Leads + Website; LinkedIn + SEO — each current → comparison with % change.
  *Verify:* matches `09-overview-comparemom.jpg` for May→June.

- [ ] **3.6** Percentage-point changes (e.g. contact rate 14.1%→30.6%) render as `pp`, not `%`.
  *Verify:* the contact-rate row reads `+16.5pp`.

### Leads

- [ ] **3.7** `src/server/viewmodels/leads.ts` — counts and rates only; `notes` never in the payload (**P3**).
  *Verify:* contract test asserts the serialised response contains no `notes` key; `curl` the endpoint and grep for a known fixture note string → no match.

- [ ] **3.8** Overview cards: total inbound, leads by source, Contacted, Attempted, Lost/Not interested, **Contact in Future**, **Junk**, Meetings scheduled, Active days.
  *Verify:* all statuses render for June including the zero-count ones (BRD v2.1 §7.1) — this is the specific bug the current static build has.

- [ ] **3.9** Contact rate = Contacted ÷ Total, computed for the range.
  *Verify:* June reads 30.6% (15 of 49).

- [ ] **3.10** Lead source breakdown bar rows with % of total.
  *Verify:* June reads Meta Ads 48 (98%), SEO 1 (2%).

- [ ] **3.11** Meta Ads lead-status donut.
  *Verify:* June reads Attempted 27 (56%), Contacted 14 (29%), Lost 7 (15%).

- [ ] **3.12** All-inbound status distribution bar list.
  *Verify:* matches `02-leads-top.jpg`.

- [ ] **3.13** Daily inbound volume stacked bar by source, one bar per day in range including zero days.
  *Verify:* June shows 30 day slots with gaps visible, active on 16.

- [ ] **3.14** Sales rep table including **every active rep with zero assigned leads**, sourced from `config/sales-reps.json`.
  *Verify:* June shows Rathish, Mohan, Ram with 0 / "Not assigned" — the single-point-of-failure finding depends on these rows existing.

- [ ] **3.15** Contacted vs. attempted by rep chart.
  *Verify:* matches `02-leads-bottom.jpg`.

- [ ] **[!] 3.16** Intent bucket panel — renders the "not yet classified" state while `inquiryType` is null. **Do not implement either classifier** (TASK.md §8).
  *Verify:* with null `inquiryType` throughout the fixture, the panel renders an explicit unclassified state, not an empty table.

### Website

- [ ] **3.17** Overview cards: total users, sessions, page views, engaged sessions + engagement rate, bounce rate, avg. session duration, pages/session, countries reached.
  *Verify:* June matches `03-website-top.jpg` within ±1% (1,346 / 1,720 / 2,513 / 1,123 / 35.0% / 107s / 1.46 / 71).

- [ ] **3.18** `totalUsers` respects `additive: false`.
  *Verify:* a multi-day range does not display a summed users figure.

- [ ] **3.19** Daily sessions area chart across the full range.
  *Verify:* 30 points for June, peaks matching the wireframe.

- [ ] **3.20** Channel breakdown (sessions + % share) and channel quality engagement-vs-bounce chart.
  *Verify:* June reads Organic Search 929 (54.0%), Direct 692 (40.2%), Organic Social 62 (3.6%), Referral 23 (1.3%), AI Assistant 5 (0.3%).

- [ ] **3.21** Top sources detail table: source, sessions, engaged, bounce rate, channel.
  *Verify:* matches `03-website-top.jpg`.

- [ ] **3.22** AI-referral panel: sessions from chatgpt.com / copilot.microsoft.com / perplexity.ai with engagement and bounce vs. site average.
  *Verify:* June reads 5 AI sessions, 80% engagement, 20% bounce.

- [ ] **3.23** Top pages table with page-type tags from `config/page-types.json`.
  *Verify:* `/careers/` tags Talent, `/solutions/power-bi-consulting/` tags Service, `/contact-us/` tags Conversion.

- [ ] **3.24** Landing-page entry behaviour chart, country engagement table, device split.
  *Verify:* matches `03-website-mid1.jpg` and `03-website-bottom.jpg`.

- [ ] **3.25** User journey / path panel — top-N paths table is an acceptable fallback if `paths[]` is sparse (BRD §8.4).
  *Verify:* renders from `ga4.paths[]`, or an explicit empty state if absent.

### SEO

- [ ] **3.26** Overview cards: clicks, impressions, avg. CTR, avg. position, indexed pages, brand click share, countries, mobile click share.
  *Verify:* June matches `04-seo-top.jpg` (469 / 54,744 / 0.81% / 30.1 / 25 / 91% / 15 / 39.8%).

- [ ] **3.27** Avg. position is impression-weighted.
  *Verify:* the Phase 1 test still holds end-to-end; June reads 30.1, not the daily mean.

- [ ] **3.28** Brand vs. non-brand from `config/brand-terms.json` at render time.
  *Verify:* editing `brand-terms.json` changes the brand share with no re-sync and no code change.

- [ ] **3.29** `DataAsOfBanner` reading `meta.latestRecordDate` — **not** `lastSyncedAt`.
  *Verify:* a fixture with `lastSyncedAt` 2026-08-10 and `latestRecordDate` 2026-08-07 shows "data as of 7 Aug".

- [ ] **3.30** Click-generating queries table with Brand/Non-brand type column.
  *Verify:* matches `04-seo-top.jpg`.

- [ ] **3.31** High-impression zero-click table with rule-based priority (Critical: impressions > 100 and position > 50; High: > 50 and > 30) and gap-to-page-1.
  *Verify:* "azure migration consultant" (148 impr, #61.8) reads Critical; "ai tools for digital transformation" (24 impr, #30.2) reads High.

- [ ] **3.32** Top pages by clicks/impressions, clicks by country, device performance table.
  *Verify:* matches `04-seo-mid.jpg`.

- [ ] **3.33** Backlinks placeholder panel (Ubersuggest out of scope, BRD §9.3).
  *Verify:* renders an explicit not-connected panel, not an empty section.

### Email

- [ ] **3.34** Email tab static "not yet connected" state, unaffected by range changes.
  *Verify:* matches `05-email.jpg`; changing the range does not alter it or error.

### LinkedIn

- [ ] **3.35** Overview cards: new followers, page views, unique visitors, impressions, clicks, reactions, comments, posts published.
  *Verify:* June matches `06-linkedin-top.jpg` (132 / 2,349 / 787 / 16,374 / 2,099 / 522 / 7 / 9).

- [ ] **3.36** Coverage gate — a range not fully covered by `meta.uploads[]` renders `PartialDataWarning` with the gap dates, never a zero or a carry-forward.
  *Verify:* 15 Jun–15 Jul against a June-only upload shows the warning and suppresses the numbers. **This is BRD §16 criterion 5.**

- [ ] **3.37** Competitor comparison table with verdict, competitors from config.
  *Verify:* June reads TechnoRUCS 132/9/7/522/58.0 Leading vs. BytesTechnolab 15/1/0/15/15.0 Behind.

- [ ] **3.38** Daily new-followers, daily impressions/clicks, engagement-rate-by-day trends clipped to range.
  *Verify:* matches `06-linkedin-top.jpg` and `06-linkedin-mid2.jpg`.

- [ ] **3.39** Post performance list — every post in range ranked by impressions, with impressions, clicks, reactions, comments, engagement %, CTR %, video views where present.
  *Verify:* June shows 9 posts, top = Chennai Salesforce Meetup (3,353 / 1,385 / 129 / 45.2% / 41.3%).

- [ ] **3.40** Audience profile: followers by seniority, by job function, visitor industry, company size.
  *Verify:* matches `06-linkedin-mid4.jpg`.

### Total Leads

- [ ] **3.41** Comparison is **required** on this tab; falls back to previous period with an explicit label when unset.
  *Verify:* loading `/total-leads` with no `cf`/`ct` renders a labelled fallback, not an error or a blank.

- [ ] **3.42** Headline comparison cards: conversations both periods, % change, cost/lead both periods, % change, spend and campaign count.
  *Verify:* May vs. June matches `10-totalleads-top.jpg` (178 / 101 / −43.3% / +115.9% / ₹176 / ₹380).

- [ ] **3.43** Full campaign breakdown table per period with totals rows.
  *Verify:* May total 138,387 / 84,461 / 178 / ₹31,374.60 / ₹176.26; June total 95,823 / 58,392 / 101 / ₹38,423.31 / ₹380.43.

- [ ] **3.44** Grouped conversations-comparison bar chart, one group per campaign, one bar per period.
  *Verify:* matches `10-totalleads-mid.jpg`.

**Phase 3 gate:** `npm run test:recon` green for May, June, **and** July. Walk all eight tabs at three arbitrary ranges — no bare `0` where data is absent, no unlabelled comparison, no missing zero-count row.

---

# Phase 4 — Rules and narrative

*Goal: narratives render correctly for an arbitrary range Cowork has never seen.*
*Read first: TAD §10, ADR-004.*

- [ ] **4.1** `Flag` type + `src/lib/rules/engine.ts` — pure `(viewModel, thresholds) => Flag[]`.
  *Verify:* engine is importable in a Node test with no React or fs in the module graph.

- [ ] **4.2** `meta.adset.cost-per-conv-outlier` — ad set cost/conv > N× account average.
  *Verify:* fires on BC Australia 17 Jun (₹1,923, 4.6×); silent on Azure TN (₹186).

- [ ] **4.3** `meta.adset.spend-no-conversions`.
  *Verify:* fires on BC Australia Video (₹1,616, 0 conv).

- [ ] **4.4** `meta.adset.audience-overlap` — ≥3 ad sets, same region+product, overlapping flights.
  *Verify:* fires on the four June BC Australia ad sets (10/11/17/22 Jun).

- [ ] **4.5** `zoho.status.stuck-in-attempted`.
  *Verify:* fires on June (55.1% attempted).

- [ ] **4.6** `zoho.owner.concentration` — one owner > 70% of assigned.
  *Verify:* fires on June (Gopinath 43 of 49, 88%).

- [ ] **4.7** `zoho.meetings.zero`.
  *Verify:* fires on June (0 meetings, 49 leads).

- [ ] **4.8** `ga4.paid.no-attribution` — Meta spend > 0 and GA4 Paid Social sessions = 0.
  *Verify:* fires on June (UTM parameters missing — BRD §8.3 note).

- [ ] **4.9** `ga4.country.suspected-bot` — bounce > 60% and avg. duration < 10s.
  *Verify:* fires on China (67.2%, 2s); silent on India.

- [ ] **4.10** `gsc.brand-dominance`.
  *Verify:* fires on June (91% brand share).

- [ ] **4.11** `gsc.zero-click-opportunity` — impressions > 100, position > 50, clicks = 0.
  *Verify:* fires on the azure-migration cluster.

- [ ] **4.12** `linkedin.coverage.competitor-lead`.
  *Verify:* fires on June (58.0 vs. 15.0 reactions/post).

- [ ] **4.13** `channel.status.degraded` — any channel-health row at `action-needed`.
  *Verify:* fires on June (SEO non-brand clicks −80.5%).

- [ ] **4.14** Built-in default templates for **every** rule in `src/lib/narrative/templates.ts`.
  *Verify:* with `narratives.json` deleted entirely, every flag still renders a correct plain sentence. **This is the property that makes the design safe.**

- [ ] **4.15** Placeholder renderer — `{placeholder}` filled from `flag.values`, formatted through the metric registry (₹, %, thousands separators, pluralisation).
  *Verify:* `₹{costPerConv}` renders `₹1,923.21`, not `₹1923.21`.

- [ ] **4.16** `narratives.json` loader keyed by **flag ID**; missing phrasing falls back to the default template silently.
  *Verify:* a flag with no entry renders the default; a flag with an entry renders the authored wording with live numbers.

- [ ] **4.17** `NarrativeBlock` (What's working / What's not) + `ActionList` (Immediate / Process / Strategic) + `FlagCallout`.
  *Verify:* matches the narrative sections in `02-leads-bottom.jpg`, `03-website-bottom.jpg`, `04-seo-bottom.jpg`.

- [ ] **4.18** Narrative wired into all seven data tabs.
  *Verify:* each tab renders its own flags; Email renders none.

- [ ] **4.19** **Arbitrary-range narrative test** — select 14 Jun–2 Aug (a range no signature could exist for) and assert the narrative renders with numbers matching that exact range.
  *Verify:* test green. This is the regression guard for ADR-004.

**Phase 4 gate:** delete `data/narratives.json`, reload every tab — narratives still render correctly. Restore it; authored wording appears with live numbers.

---

# Phase 5 — Ingestion contract and hardening

*Goal: a Cowork run updates `/data`, auto-deploys, and the dashboard reflects it with accurate sync badges.*
*Read first: TAD §8, §12, §15, ADR-003, ADR-010.*

- [ ] **5.1** `Docs/COWORK_SYNC_SPEC.md` — the ingestion contract: per-channel cadence, lookback windows, natural keys, the 12-step run algorithm, validation gates, commit message format.
  *Verify:* spec covers all five channels and every gate in TAD §8.3.

- [ ] **5.2** Spec states Zoho's lookback keys on **`Modified_Time` as well as `Created_Time`**.
  *Verify:* explicitly documented with the reason (lead status mutates after creation — TAD D9).

- [ ] **5.3** Spec states ratios are decomposed at ingestion: GA4 `bounceRate` → `bouncedSessions`; GSC `position` → `sumPosition`.
  *Verify:* both documented with worked examples.

- [ ] **5.4** `scripts/validate-data.mjs` — ajv, every `/data` file against `/schemas`.
  *Verify:* `npm run validate:data` exits 0 on good data, 1 on a deliberately broken file.

- [ ] **5.5** Validation gates: missing `meta`, empty records where previous run had data, `latestRecordDate` moving backward, row count drop > 50%.
  *Verify:* four fixture cases each fail with a distinct message.

- [ ] **5.6** `scripts/check-sync-timestamps.mjs` — asserts each changed data file's `lastSyncedAt` is within tolerance of its commit timestamp (**BRD §16 criterion 7**).
  *Verify:* passes on a good commit; fails on a file whose `lastSyncedAt` is a week off.

- [ ] **5.7** CI job running `validate:data` and `check-sync-timestamps` on PRs touching `data/**`, checked out with `fetch-depth: 0`.
  *Verify:* workflow includes both and the full-history checkout (shallow clone breaks 5.6).

- [ ] **5.8** `scripts/linkedin/convert.ts` — pure `convertLinkedInExport(sheets) => {data, coverage, warnings}`. No fs, no network, no globals.
  *Verify:* unit-testable with in-memory sheet objects; no `fs` import in the module.

- [ ] **5.9** Coverage derived from actual min/max dates in the sheets, not the filename.
  *Verify:* test — a file named "june" containing 3 Jun–28 Jun data yields coverage 2026-06-03..2026-06-28.

- [ ] **5.10** CLI wrapper `npm run convert:linkedin -- <paths>` handling file I/O and the `meta.uploads[]` append.
  *Verify:* running against fixture XLS files produces a schema-valid `linkedin.json`.

- [ ] **5.11** Committed fixture XLS files (Followers, Visitors, Content) + conversion tests.
  *Verify:* `npm test` covers the conversion path.

- [ ] **5.12** `GET /api/health/data` — per-channel `lastSyncedAt`, `latestRecordDate`, row counts, computed `stale` boolean.
  *Verify:* authenticated request returns all five channels; a stale fixture flags `stale: true`.

- [ ] **5.13** `LastSyncedBadge` — neutral within cadence, amber past 2×, red past 4×, absolute IST timestamp on hover. Thresholds in config.
  *Verify:* three fixtures render the three states; changing the config value changes the threshold with no code edit.

- [ ] **5.14** Badge placed on every tab next to its data-source subtitle, not only Overview.
  *Verify:* present on all seven data tabs.

- [ ] **5.15** React error boundaries per tab section — one failing chart cannot blank a page.
  *Verify:* force a throw in one chart; the rest of the tab still renders.

- [ ] **5.16** Loader failure isolation end-to-end: one corrupt channel file degrades that channel only.
  *Verify:* corrupt `gsc.json` → SEO shows an error state, other tabs unaffected.

- [ ] **5.17** Performance budget measured: p95 cold aggregate < 800ms, warm < 150ms, 304 < 50ms.
  *Verify:* record measured numbers in the Session state notes. Investigate before shipping if any exceeds budget.

- [ ] **5.18** 12-month range change stays inside the 3-second ceiling (BRD §15.3).
  *Verify:* measured and recorded.

- [ ] **5.19** Responsive pass: sidebar collapses to a drawer, KPI rows reflow to two columns, tables scroll inside their own container.
  *Verify:* at 768px the page body has no horizontal scroll.

- [ ] **5.20** Accessibility pass: keyboard-navigable picker and sidebar, visible focus rings on dark ground, status conveyed by text as well as colour, every chart paired with its table.
  *Verify:* full keyboard traversal of one tab without a mouse; no colour-only status.

- [ ] **5.21** Vercel Analytics + Speed Insights enabled. No PII in logs.
  *Verify:* aggregation error logs carry channel + range only — no lead content.

- [ ] **5.22** `Docs/RUNBOOK.md` for the CMO, plain language: trigger an out-of-schedule sync; hand over a LinkedIn XLS; read the sync badges; edit brand terms / page types / competitors / thresholds; who to contact when a channel goes stale.
  *Verify:* a non-technical reader can follow it without reading any other document.

- [ ] **5.23** Full acceptance-criteria pass against BRD §16 items 1–8 (`TASK.md` §11).
  *Verify:* each of the eight demonstrated and recorded.

- [ ] **5.24** Production auth verified: non-`technorucs.com` account rejected; `/data` unreachable by URL.
  *Verify:* `curl https://<prod>/data/zoho-crm.json` returns 404 — **not** JSON.

- [ ] **5.25** `npm run scan:secrets` green against the real `/data` (BRD §16 criterion 6).
  *Verify:* exits 0.

- [ ] **5.26** End-to-end pipeline test: a real Cowork run writes `/data`, pushes, Vercel deploys, the dashboard reflects it with correct badges.
  *Verify:* observed once, start to finish.

**Phase 5 gate:** all eight BRD §16 acceptance criteria demonstrated, plus 5.24 and 5.25 green in production.

---

## Deferred — do not build without a decision

| Item | Blocked on | Where |
|---|---|---|
| Lead intent classification (Zoho picklist vs. Cowork classifier) | CMO | TAD §16.1, item 3.16 |
| Staleness thresholds sign-off | CMO — defaults implemented, confirmation pending | TAD §16.2, item 5.13 |
| Wireframe refresh for the new picker | Not a blocker; update the wireframe from the Phase 2 build | TAD §16.3 |
| Instantly.ai email integration | Out of scope this phase | BRD §10 |
| Ubersuggest / backlinks | Connector unreliable; out of scope | BRD §9.3 |
| In-app LinkedIn upload UI | Would put a GitHub write token in the app — needs an explicit decision to accept | TAD ADR-003 |
| UTM parameters on Meta Ads URLs | **Ads team, not the developer** — but until it lands, GA4 paid attribution is structurally zero | BRD §8.3 note |
