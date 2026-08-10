# TASK — TechnoRUCS CMO Dashboard implementation

**Read this file completely before writing any code. Then read `CHECKLIST.md`.**

---

## 0. If you are resuming an interrupted session, start here

Do these four steps before anything else. Do not skip to the code.

1. **Open `CHECKLIST.md`** and read the *Session state* block at the top.
2. **Find the last item marked `[x]`. Do not trust it.** Run that item's `Verify:` command.
   - **Verify passes** → the item is genuinely done. Move to the first `[ ]` item.
   - **Verify fails** → the interruption landed mid-item. Change `[x]` back to `[ ]`, then redo it.
3. **Run the current phase's gate command** (listed at the end of each phase in `CHECKLIST.md`). If it fails, fix that before starting new work — a broken gate means an earlier item regressed.
4. **Check `git log --oneline -10`.** Uncommitted work in the tree that is not reflected in the checklist is interrupted work; reconcile it before continuing.

Never start a later phase while an earlier phase's gate is red.

---

## 1. What you are building

A database-free, JSON-backed marketing dashboard for TechnoRUCS's CMO. Eight tabs (Overview, Ad Campaigns, Leads, Website, SEO, Email, LinkedIn, Total Leads) over six data sources, driven by a **global custom date range picker** with an optional comparison range.

The system has three planes that never call each other at request time:

```
Claude Cowork (scheduled)  →  /data/*.json in Git  →  Next.js app on Vercel  →  CMO's browser
   holds ALL credentials       day-granular truth      holds NO credentials
```

You are building **only the third plane** — the Next.js application — plus the repo-side contracts the first plane must satisfy (JSON Schemas, validation scripts, the LinkedIn conversion module). You are not building the Cowork job itself; you are building what it commits against.

**The app makes zero outbound calls to Meta, Zoho, GA4, GSC, or LinkedIn. Ever.** If you find yourself reaching for an API client for any of those, you have misread the architecture.

---

## 2. Source of truth — in precedence order

When these disagree, the higher one wins.

| # | Document | Role |
|---|---|---|
| 1 | `Docs/TechnoRUCS_CMO_Dashboard_Technical_Architecture_v1.0.md` | **The architecture. Build from this.** Section 17 lists where it deliberately overrides the TRD — those overrides are intentional, not errors. |
| 2 | `Docs/TechnoRUCS_CMO_Dashboard_TRD_v1.0.md` | Technical spec. Authoritative *except* where the TAD's §17 supersedes it. |
| 3 | `Docs/TechnoRUCS_CMO_Dashboard_RealTime_Requirements_v2.1.md` | Business requirements — the "why". Acceptance criteria live in §16. |
| 4 | `Wireframe/*.jpg` | 25 screens showing every tab's layout, components, and copy tone. The visual system is frozen — match it. |

Shorthand used below: **TAD** = architecture doc, **TRD** = technical requirements, **BRD** = business requirements.

Read the TAD's §3 (principles), §4 (decision records), and §17 (deviations) before Phase 0. Read the relevant TAD section before each phase; they are cross-referenced from `CHECKLIST.md`.

---

## 3. Non-negotiable invariants

These are the eight principles from TAD §3. A change that violates one of these is wrong even if it passes tests and looks correct. If a task seems to require breaking one, that is a signal to stop and ask (§8).

| # | Invariant | What it means when you are coding |
|---|---|---|
| **P1** | **Day-granular in, derived at read.** | No ratio, rate, average, or total is ever stored in `/data`. CTR, CPC, CPM, cost/conversation, engagement rate, bounce rate, contact rate, average position — all computed from summed numerators and denominators for the selected range. |
| **P2** | **The app holds no third-party credentials.** | No Meta/Zoho/GA4/GSC/LinkedIn/GitHub tokens in code, env vars, or `/data`. No write path from the app to Git. |
| **P3** | **Raw records never reach the browser.** | Aggregation runs server-side. `zoho-crm.json`'s `notes` field must never appear in an HTTP response. View models carry counts and rates, not records. |
| **P4** | **Absence is a first-class value, never zero.** | Every channel query returns a `Coverage` union. A range with no data renders an explicit state, not `0`. A ratio with a zero denominator resolves to `null`, rendered `—`, not `0`. |
| **P5** | **One clock: Asia/Kolkata (+05:30).** | All date bucketing goes through `lib/time`. Raw `new Date(...)` / `Date.parse(...)` is lint-banned outside that module. |
| **P6** | **The computation core is pure and isomorphic.** | `src/lib/**` has no I/O, no React, no `process`, no imports from `src/server` or `src/app`. It is the only place metrics are defined. |
| **P7** | **Numbers are computed; only phrasing is authored.** | The rules engine computes flags and their values live. `narratives.json` supplies wording with `{placeholders}` — never numbers. |
| **P8** | **The visual system is frozen.** | Dark theme `#0d1117`, existing card/table/bar-row components, existing status colours. This is a data and filtering upgrade, not a redesign. Lift tokens from the wireframe; do not invent a new look. |

Two of these are enforced mechanically — set them up in Phase 0 and do not disable them:

- **P5** — an ESLint `no-restricted-syntax` rule banning `new Date(` and `Date.parse(` outside `src/lib/time/**`.
- **P6** — an import-boundary rule: `src/lib/**` may not import from `src/server/**`, `src/app/**`, `src/components/**`, or `react`.

---

## 4. Tech stack

Exactly this. Do not substitute without asking (§8).

| Concern | Package | Notes |
|---|---|---|
| Framework | `next@15` (App Router), `react@19` | TAD ADR-005 |
| Language | TypeScript, `strict: true` | No `any` in `src/lib/**` |
| Auth | `next-auth@5` (Auth.js v5) | Microsoft Entra ID provider, JWT sessions, **no database adapter** |
| Validation | `zod` | Runtime parse at the loader boundary; also the source for JSON Schemas |
| Schema gen | `zod-to-json-schema` | Generates `/schemas/*.json` from the Zod schemas |
| Client cache | `@tanstack/react-query` | `staleTime: Infinity` — data is immutable per deployment |
| Charts | `recharts` | Series colours read from CSS tokens, not library defaults |
| Date picker | `react-day-picker` | Plus the seven custom presets |
| Dates | `date-fns` + a timezone helper | Wrapped by `lib/time`; never called directly elsewhere |
| Tests | `vitest` | Unit + contract + reconciliation |
| JSON Schema validation | `ajv` | Used by `scripts/validate-data.mjs` in CI |
| XLSX parsing | `xlsx` (SheetJS) | LinkedIn conversion module only, never in app code |

Runtime for route handlers is **Node.js, not Edge** — handlers read `/data` from the filesystem and Edge has no `fs`.

Critical `next.config.ts` entry — without it `/data` is not shipped into the serverless bundle and every request 500s in production while working fine locally:

```ts
export default {
  outputFileTracingIncludes: {
    '/api/metrics/[tab]': ['./data/**/*.json'],
    '/api/health/data':   ['./data/**/*.json'],
  },
}
```

---

## 5. Repository layout

Full tree in TAD Appendix A. The parts that matter most:

```
data/                    ← repo ROOT. Server-read only. NEVER move this into /public.
  *.json                    Moving it to /public makes every lead note a public URL.
  config/                   Tunable lists: brand terms, page types, competitors,
                            thresholds, sales-rep roster.
schemas/                 ← generated from Zod, committed
scripts/                 ← validation, secret scan, LinkedIn conversion
src/
  app/                   ← routing + route handlers. Thin.
  server/                ← loader, view-model composition. I/O lives here.
  lib/                   ← PURE. Metrics, rules, narrative, time. No I/O, no React.
  components/            ← presentation. NEVER computes a metric.
tests/
  fixtures/              ← committed sample data for every channel
  reconciliation/        ← golden files for May/June/July 2026
```

The layering rule that keeps this honest: **a component that imports from `src/lib/metrics` is a bug.** Components receive formatted values.

---

## 6. Working protocol

### 6.1 One item at a time

Work `CHECKLIST.md` top to bottom. For each item:

1. Read the item and its TAD reference.
2. Implement it.
3. **Run its `Verify:` command.** If it fails, fix before moving on.
4. Mark `[x]`.
5. Commit (§6.3).
6. Update the *Session state* block at the top of `CHECKLIST.md`.

Do not batch five items and then mark them all. The checklist's value is that it is accurate at every moment, including the moment you are interrupted.

### 6.2 When you deviate

If you implement something differently from what the item says, append a one-line note under the item:

```markdown
- [x] **1.7** Loader caches parsed datasets per instance — *Verify:* ...
      > Used a module-level Map instead of LRU — only 6 channels, eviction is pointless.
```

Deviations that touch an invariant (§3) or a decision record (TAD §4) are not yours to make. Stop and ask (§8).

### 6.3 Commits

One commit per checklist item, or per tight group of items. Message format:

```
<phase>.<item> <what changed>

Example:
1.4 Add Ratio type and sum-then-resolve helpers
3.2 Leads tab — status cards render all statuses including zero-count
```

Commit even for small items. Git history is your second recovery mechanism when the checklist and the working tree disagree.

### 6.4 Tests are not a separate phase

Every item that adds logic to `src/lib/**` adds its tests in the same item. There is no "write the tests later" step in this plan, because the highest-risk defect class here — a filtering bug — produces a plausible wrong number rather than an error. It will not be caught by looking at the page.

---

## 7. Definition of done

An item is done when **all** hold:

- Its `Verify:` command passes.
- `npm run typecheck` is clean.
- `npm run lint` is clean (including the P5 and P6 boundary rules).
- `npm test` is green.
- No invariant in §3 is violated.
- It is committed.

A **phase** is done when every item is done and the phase gate command passes.

---

## 8. STOP conditions — ask, do not guess

Stop work and ask the user when you hit any of these. Do not pick a plausible default and continue; a wrong guess here is expensive to unwind later.

| Situation | Why it's a stop |
|---|---|
| **Lead intent classification** (TAD §16.1) is needed | Two paths — Zoho `Inquiry_Type` picklist vs. Cowork classification of `notes`. Unresolved by the CMO. Until resolved, `inquiryType` stays `null` and the Leads tab renders the "not yet classified" state. **Build that state; do not implement either classifier.** |
| A requirement contradicts an invariant in §3 | The invariant is probably right and the requirement misread. Confirm before breaking either. |
| The BRD/TRD/TAD disagree in a way §2's precedence does not resolve | Precedence covers most conflicts. If it doesn't, the docs have a real gap. |
| A wireframe screen shows something no document specifies | The wireframe is a reference build, not a spec — it may show a bug (see §9). |
| You need a credential, token, or API key of any kind | Violates P2. There is no legitimate case for this in the app. |
| Real `/data` files do not exist yet and you need to see actual data shape | Build against `tests/fixtures/**` and say so. Do not invent production data. |
| A package in §4 is unavailable or its API has changed materially | Substitutions change the architecture's assumptions. |
| Staleness thresholds / badge treatment (TAD §16.2) | Cosmetic and config-driven — implement the proposed defaults, but flag for confirmation rather than treating it as settled. |

When you stop: state what you hit, what the options are, what you recommend and why, and what you have done in the meantime. Then wait.

---

## 9. Project-specific traps

These are the mistakes this codebase invites. Each one produces a number that looks right.

**Averaging an average.** A range's bounce rate is `Σ bouncedSessions ÷ Σ sessions`, *not* the mean of the daily bounce rates — the latter over-weights low-traffic days. Same for engagement rate, CTR, cost/conversation, contact rate, average position. The `Ratio` type exists to make this a type error; do not route around it by resolving early and summing numbers.

**Average position must be impression-weighted.** GSC stores `sumPosition` (position × impressions). Range average = `Σ sumPosition ÷ Σ impressions`. Anything else disagrees with Search Console and the CMO will notice.

**Summing non-additive metrics.** `reach` (Meta) and `totalUsers` (GA4) are de-duplicated by the source platform. Summing them across days over-counts people who visited twice. The registry marks them `additive: false` — respect it.

**Dropping zero-count rows.** The current static build omits "Contact in Future" and "Junk" cards when their count is zero. BRD v2.1 §7.1 was written specifically to forbid this — a zero-count status is a data point ("no leads reached this stage"), distinct from an untracked one. Same for sales reps with zero assigned leads: the "Rathish, Mohan, and Ram got zero leads" finding *is* the insight, and it vanishes if you filter the rows out. Rep roster comes from `data/config/sales-reps.json`, not from the filtered lead set.

**Rendering `0` for "no data".** A range before a channel's history starts is not a zero month. Route through `Coverage` (P4).

**Timezone drift on Zoho leads.** A lead created `2026-06-01T00:15:00+05:30` belongs to June. Parse with `lib/time`, always.

**Treating `lastSyncedAt` and `latestRecordDate` as the same thing.** For GSC they differ by 2–3 days *by design* (Google's reporting lag). The "data as of" banner reads `latestRecordDate`; the "last synced" badge reads `lastSyncedAt`. Conflating them reports Google's lag as a sync failure.

**Narrative keyed by date range.** `narratives.json` is keyed by **flag ID**, not range signature (TAD ADR-004). Range-signature keying renders an empty narrative for any range Cowork hasn't seen — which is most of them.

**Putting `/data` in `/public`.** Anything under `/public` is a public URL regardless of repo visibility. This is the single worst mistake available in this codebase.

---

## 10. Quick reference

**Routes** (`/` redirects to `/overview`)

| Route | Source | Comparison |
|---|---|---|
| `/overview` | all channels | required — defaults to previous period |
| `/ad-campaigns` | `meta-ads` | optional |
| `/leads` | `zoho-crm` | optional |
| `/website` | `ga4` | optional |
| `/seo` | `gsc` | optional |
| `/email` | none | n/a — static "not yet connected" |
| `/linkedin` | `linkedin` | optional |
| `/total-leads` | `meta-ads` | **required** |

**URL contract** — the single source of truth for range state:

```
/leads?from=2026-06-01&to=2026-06-30&cf=2026-05-01&ct=2026-05-31&preset=last-month
```

Invalid or missing params fall back to the current calendar month to date (BRD §4.1). No duplicate range state in React.

**Date range presets** (BRD §4.1): Today · Last 7 days · Last 30 days · This Month · Last Month · This Quarter · Custom. All computed against IST "today", not the browser clock.

**Status thresholds** (BRD Appendix A, in `data/config/thresholds.json`): Leading > +15% · Good within ±5% or meeting a target band · Monitor 5–30% unfavourable · Action needed > 30% unfavourable or below a floor. "Unfavourable" requires the metric's `polarity` from the registry — cost/conversation rising is bad, sessions rising is good.

**Flat band**: `|pct| ≤ 2%` renders "≈ flat" (BRD §5.2).

**Channels and their files**

| Channel | File | Natural key | Cadence |
|---|---|---|---|
| Meta Ads | `meta-ads.json` | `date + adSetId + country` | 1–6 h |
| Zoho CRM | `zoho-crm.json` | `leadId` | 1–6 h |
| GA4 | `ga4.json` | `date + slice dimensions` | daily |
| GSC | `gsc.json` | `date + slice dimensions` | daily |
| LinkedIn | `linkedin.json` | `date` / `postId` | on upload |

**Commands**

```bash
npm run dev              # local dev server
npm run typecheck        # tsc --noEmit
npm run lint             # eslint, includes P5/P6 boundary rules
npm test                 # vitest
npm run test:recon       # reconciliation suite only
npm run validate:data    # ajv — every /data file against /schemas
npm run schemas:build    # regenerate /schemas from Zod
npm run scan:secrets     # credential patterns in /data and src
npm run build            # production build
```

**Environment variables** (TAD Appendix B) — note what is *absent*: no third-party API keys, in any environment.

```
AUTH_SECRET
AUTH_MICROSOFT_ENTRA_ID_ID
AUTH_MICROSOFT_ENTRA_ID_SECRET
AUTH_MICROSOFT_ENTRA_ID_ISSUER
AUTH_ALLOWED_DOMAIN=technorucs.com
AUTH_ALLOWED_EMAILS          # optional allowlist; empty = domain-only
```

---

## 11. Acceptance criteria (BRD §16) — what "finished" means

The build is complete when all of these are demonstrably true. They are the phase-5 exit gate.

1. Any custom range updates every card, table, and chart on all eight tabs, recalculated from `/data` for that exact range — never interpolated from monthly snapshots.
2. A comparison range correctly recomputes every % change (channel health table, the three period-comparison blocks, Total Leads).
3. A range matching a full calendar month matches the published static dashboard for that month within ±1%.
4. Zoho figures always exclude Partner, Referral, and ZoomInfo — for every range.
5. LinkedIn metrics display only for ranges fully covered by upload data; partial or uncovered ranges show an explicit gap state, never a zero or a stale carry-forward.
6. No API credentials in code, client bundle, network calls, or `/data`.
7. Each source's "last synced" timestamp matches the most recent commit touching its JSON file.
8. The CMO can complete a LinkedIn XLS handoff and request an out-of-schedule sync without developer help, using the runbook.
