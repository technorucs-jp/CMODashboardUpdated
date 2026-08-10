# TASK — TechnoRUCS CMO Dashboard implementation

**Read this file completely before writing any code. Then read `CHECKLIST.md`.**

*Rewritten 2026-08-10 against TAD v1.1 §0 (ADR-011–014) — Vite + React SPA, no application backend. If you have an older mental model of this project from the TAD's v1.0 body, TRD, or BRD's original text, this file and `CHECKLIST.md` override it wherever they differ.*

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

The system has two planes, not three — there is no application server:

```
Claude Cowork (scheduled)  →  public/data/*.json in Git  →  Vite static build  →  CMO's browser
   holds ALL credentials       day-granular truth,           no server, no API,      does the
                                minus notes/PII                just static files      filtering & auth
```

You are building **only the static React app** — plus the repo-side contracts the first plane must satisfy (JSON Schemas, validation scripts, the LinkedIn conversion module). You are not building the Cowork job itself; you are building what it commits against.

**The app makes zero outbound calls to Meta, Zoho, GA4, GSC, or LinkedIn. Ever.** If you find yourself reaching for an API client for any of those, you have misread the architecture. It also has **no server of its own** — no route handlers, no middleware, no edge functions. If you find yourself writing one, stop; that was the pre-pivot design (TAD v1.0 body, superseded by TAD v1.1 §0).

---

## 2. Source of truth — in precedence order

When these disagree, the higher one wins.

| # | Document | Role |
|---|---|---|
| 1 | `Docs/TechnoRUCS_CMO_Dashboard_Technical_Architecture_v1.0.md` **§0** | **The current architecture. Build from §0's ADR-011–014, not the v1.0 body below it.** The v1.0 body (§1–18, Appendices) is kept for its *reasoning* (why P1/P3/P4 etc. matter) but its *mechanism* (Next.js, route handlers, server aggregation) is superseded. §0.9 lists exactly which sections are historical only. |
| 2 | `Docs/TechnoRUCS_CMO_Dashboard_TRD_v1.0.md` | Technical spec. Its own §0 addendum points out where the TAD supersedes it (frontend framework, data path, auth, filtering location). Authoritative on everything else. |
| 3 | `Docs/TechnoRUCS_CMO_Dashboard_RealTime_Requirements_v2.1.md` | Business requirements — the "why". Acceptance criteria live in §16. Its v2.2 note flags the one place the pivot touches a stated business requirement (access control). |
| 4 | `Wireframe/*.jpg` | 25 screens showing every tab's layout, components, and copy tone. The visual system is frozen — match it. Unaffected by the architecture pivot. |

Shorthand used below: **TAD** = architecture doc, **TRD** = technical requirements, **BRD** = business requirements.

Read the TAD's §0 (the pivot), §3 (principles — P3 is restated by §0.3), and §4/§16 (decision records + open items, including the new §16.4) before Phase 0. Read the relevant TAD section before each phase; they are cross-referenced from `CHECKLIST.md`.

---

## 3. Non-negotiable invariants

These are the eight principles from TAD §3, two of them restated by the v1.1 pivot (§0). A change that violates one of these is wrong even if it passes tests and looks correct. If a task seems to require breaking one, that is a signal to stop and ask (§8).

| # | Invariant | What it means when you are coding |
|---|---|---|
| **P1** | **Day-granular in, derived at read.** | No ratio, rate, average, or total is ever stored in `public/data`. CTR, CPC, CPM, cost/conversation, engagement rate, bounce rate, contact rate, average position — all computed from summed numerators and denominators for the selected range, in the browser. |
| **P2** | **The app holds no third-party credentials.** | No Meta/Zoho/GA4/GSC/LinkedIn tokens in code, env vars, or `public/data`. Unaffected by the pivot — this was always about the *app*, not about whether it has a server. |
| **P3′** | **No field the browser has no legitimate reason to see is ever *written* into `public/data/**`.** (Restates the old "raw records never reach the browser" — TAD §0.3.) | `zoho-crm.json`'s `notes` field must never exist in the shipped file at all — enforced by a `.strict()` Zod schema with no `notes` property, not by redacting it somewhere downstream. There is no server left to redact anything at request time. |
| **P4** | **Absence is a first-class value, never zero.** | Every channel query returns a `Coverage` union. A range with no data renders an explicit state, not `0`. A ratio with a zero denominator resolves to `null`, rendered `—`, not `0`. |
| **P5** | **One clock: Asia/Kolkata (+05:30).** | All date bucketing goes through `lib/time`. Raw `new Date(...)` / `Date.parse(...)` is lint-banned outside that module. |
| **P6** | **The computation core is pure and framework-agnostic.** | `src/lib/**` has no I/O, no React import, no DOM global, no `fetch`. It is the only place metrics are defined. (Was "isomorphic" pre-pivot, meaning "runs on server or client" — now it only ever runs in the browser, but the purity rule is identical and just as mechanically enforced.) |
| **P7** | **Numbers are computed; only phrasing is authored.** | The rules engine computes flags and their values live, client-side. `narratives.json` supplies wording with `{placeholders}` — never numbers. |
| **P8** | **The visual system is frozen.** | Dark theme, existing card/table/bar-row components, existing status colours. This is a data and filtering upgrade, not a redesign. Lift tokens from `static-preview.html` (the actual reference file uses base `#0f0f0f`/`#1a1a1a`/`#141414`; the TAD's P8 text names `#0d1117` — a wording slip in the doc, not a design call. Use the TAD's literal `#0d1117` per document precedence (§2), and note the deviation from the reference file's literal hex once in `tokens.css`'s header comment so a future reader isn't confused; the two are visually indistinguishable on a dark theme and nothing in the wireframes depends on the exact value). Do not invent a new look. |

Two of these are enforced mechanically — set them up in Phase 0 and do not disable them:

- **P5** — an ESLint `no-restricted-syntax` rule banning `new Date(` and `Date.parse(` outside `src/lib/time/**`.
- **P6** — an import-boundary rule: `src/lib/**` may not import from `src/routes/**`, `src/components/**`, `src/data/**`, `src/auth/**`, or `react`.

---

## 4. Tech stack

Exactly this. Do not substitute without asking (§8).

| Concern | Package | Notes |
|---|---|---|
| Build tool | `vite@5+` | Static output only — no SSR, no Vite plugins that introduce a server |
| Framework | `react@19` | No Next.js — TAD ADR-011 |
| Routing | `react-router@6+` (`react-router-dom`) | Client-side routes; URL is still the single source of truth for range state |
| Language | TypeScript, `strict: true` | No `any` in `src/lib/**` |
| Auth | `@azure/msal-browser`, `@azure/msal-react` | Microsoft Entra ID, browser-only PKCE flow, **no server session** — TAD ADR-013 |
| Validation | `zod` | Runtime parse in the client fetch layer; also the source for JSON Schemas |
| Schema gen | `zod-to-json-schema` | Generates `/schemas/*.json` from the Zod schemas |
| Client cache | `@tanstack/react-query` | `staleTime: Infinity` — data is immutable per deployment |
| Charts | `recharts` | Series colours read from CSS tokens, not library defaults |
| Date picker | `react-day-picker` | Plus the seven custom presets |
| Dates | `date-fns` + a timezone helper | Wrapped by `lib/time`; never called directly elsewhere |
| Tests | `vitest` | Unit + contract + reconciliation; pairs natively with Vite |
| JSON Schema validation | `ajv` | Used by `scripts/validate-data.mjs` in CI |
| XLSX parsing | `xlsx` (SheetJS) | LinkedIn conversion module only, never in app code |

There is no "runtime" to choose (Node vs Edge) — there is no server. Build-time tooling (`scripts/**`) still runs under plain Node; that is unrelated to the app having no backend.

`vercel.json` (or the equivalent for whatever static host is used) replaces the old `next.config.ts` concern — it sets `Cache-Control` headers for `public/data/**` and, if the CMO confirms it per TAD §16.4, enables deployment-level password protection.

---

## 5. Repository layout

Full tree in TAD §0.7 (supersedes the old Appendix A). The parts that matter most:

```
public/
  data/                    ← deliberately PUBLIC now (ADR-012/014). NOT server-only — that rule flipped.
    *.json                    zoho-crm.json has no `notes` field, enforced by schema, not by policy.
    config/                   Tunable lists: brand terms, page types, competitors,
                              thresholds, sales-rep roster.
schemas/                 ← generated from Zod, committed
scripts/                 ← validation, secret scan, LinkedIn conversion (Node, build/CI-time only)
src/
  main.tsx / App.tsx     ← Vite entry, router root, MsalProvider, QueryClientProvider
  auth/                  ← MSAL config, AuthGuard, tenant/allowlist predicate
  routes/                ← one module per tab + layout + login. Thin.
  data/                  ← fetch + Zod parse + in-memory cache. I/O lives here (was src/server/).
  viewmodels/            ← view-model composition, called from hooks
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
- [x] **1.7** Loader caches parsed datasets per session — *Verify:* ...
      > Used a module-level Map instead of LRU — only 6 channels, eviction is pointless.
```

Deviations that touch an invariant (§3) or a decision record (TAD §4 / §0) are not yours to make. Stop and ask (§8).

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
| **Lead intent classification** (TAD §16.1) is needed | Two paths — Zoho `Inquiry_Type` picklist vs. Cowork classification of `notes`. Unresolved by the CMO. Until resolved, `inquiryType` stays `null` and the Leads tab renders the "not yet classified" state. **Build that state; do not implement either classifier.** Note: Path B (Cowork classifies `notes`) still works fine under the pivot — Cowork reads `notes` from its own private Zoho pull and writes only the resulting bucket, never the note itself, into `zoho-crm.json` (consistent with P3′). |
| A requirement contradicts an invariant in §3 | The invariant is probably right and the requirement misread. Confirm before breaking either. |
| The BRD/TRD/TAD disagree in a way §2's precedence does not resolve | Precedence covers most conflicts. If it doesn't, the docs have a real gap. |
| A wireframe screen shows something no document specifies | The wireframe is a reference build, not a spec — it may show a bug (see §9). |
| You need a credential, token, or API key of any kind | Violates P2. There is no legitimate case for this in the app. |
| Real `public/data` files do not exist yet and you need to see actual data shape | Build against `tests/fixtures/**` and say so. Do not invent production data. |
| A package in §4 is unavailable or its API has changed materially | Substitutions change the architecture's assumptions. |
| Staleness thresholds / badge treatment (TAD §16.2) | Cosmetic and config-driven — implement the proposed defaults, but flag for confirmation rather than treating it as settled. |
| The residual `public/data` exposure (TAD §16.4) is about to matter — e.g. you are about to ship to production in Phase 5 | Not a blocker before Phase 5, but item 5.24 cannot be marked done without the CMO's explicit answer: accept the exposure as-is, or require host-level password protection first. |

When you stop: state what you hit, what the options are, what you recommend and why, and what you have done in the meantime. Then wait.

---

## 9. Project-specific traps

These are the mistakes this codebase invites. Each one produces a number that looks right.

**Averaging an average.** A range's bounce rate is `Σ bouncedSessions ÷ Σ sessions`, *not* the mean of the daily bounce rates — the latter over-weights low-traffic days. Same for engagement rate, CTR, cost/conversation, contact rate, average position. The `Ratio` type exists to make this a type error; do not route around it by resolving early and summing numbers.

**Average position must be impression-weighted.** GSC stores `sumPosition` (position × impressions). Range average = `Σ sumPosition ÷ Σ impressions`. Anything else disagrees with Search Console and the CMO will notice.

**Summing non-additive metrics.** `reach` (Meta) and `totalUsers` (GA4) are de-duplicated by the source platform. Summing them across days over-counts people who visited twice. The registry marks them `additive: false` — respect it.

**Dropping zero-count rows.** The current static build omits "Contact in Future" and "Junk" cards when their count is zero. BRD v2.1 §7.1 was written specifically to forbid this — a zero-count status is a data point ("no leads reached this stage"), distinct from an untracked one. Same for sales reps with zero assigned leads: the "Rathish, Mohan, and Ram got zero leads" finding *is* the insight, and it vanishes if you filter the rows out. Rep roster comes from `public/data/config/sales-reps.json`, not from the filtered lead set.

**Rendering `0` for "no data".** A range before a channel's history starts is not a zero month. Route through `Coverage` (P4).

**Timezone drift on Zoho leads.** A lead created `2026-06-01T00:15:00+05:30` belongs to June. Parse with `lib/time`, always.

**Treating `lastSyncedAt` and `latestRecordDate` as the same thing.** For GSC they differ by 2–3 days *by design* (Google's reporting lag). The "data as of" banner reads `latestRecordDate`; the "last synced" badge reads `lastSyncedAt`. Conflating them reports Google's lag as a sync failure.

**Narrative keyed by date range.** `narratives.json` is keyed by **flag ID**, not range signature (TAD ADR-004). Range-signature keying renders an empty narrative for any range Cowork hasn't seen — which is most of them.

**Writing `notes` (or any other lead free-text) into `public/data/zoho-crm.json`.** This is the pivot-era replacement for the old "putting `/data` in `/public`" trap — that placement is now *correct* (ADR-014), so the risk moved to *content*, not *location*. The `.strict()` schema is what catches this mechanically; do not weaken it "just for debugging."

**Treating the MSAL login screen as if it gates the data.** It gates the UI only (TAD §16.4). Do not reason about `public/data/*.json` confidentiality as if a session check happens before it's served — none does. That is exactly why P3′ (§3) exists.

---

## 10. Quick reference

**Routes** (`react-router`; `/` redirects to `/overview`)

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
| `/login` | none | MSAL sign-in entry point |

**URL contract** — the single source of truth for range state (via `react-router`'s `useSearchParams`, not a server):

```
/leads?from=2026-06-01&to=2026-06-30&cf=2026-05-01&ct=2026-05-31&preset=last-month
```

Invalid or missing params fall back to the current calendar month to date (BRD §4.1). No duplicate range state in React.

**Date range presets** (BRD §4.1): Today · Last 7 days · Last 30 days · This Month · Last Month · This Quarter · Custom. All computed against IST "today", not the browser clock.

**Status thresholds** (BRD Appendix A, in `public/data/config/thresholds.json`): Leading > +15% · Good within ±5% or meeting a target band · Monitor 5–30% unfavourable · Action needed > 30% unfavourable or below a floor. "Unfavourable" requires the metric's `polarity` from the registry — cost/conversation rising is bad, sessions rising is good.

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
npm run dev              # local dev server (vite)
npm run build             # static production build
npm run preview           # serve the production build locally
npm run typecheck         # tsc --noEmit
npm run lint               # eslint, includes P5/P6 boundary rules
npm test                   # vitest
npm run test:recon        # reconciliation suite only
npm run validate:data     # ajv — every public/data file against /schemas
npm run schemas:build     # regenerate /schemas from Zod
npm run scan:secrets      # credential patterns in public/data and src
```

**Environment variables** (TAD §0.8) — note what is *absent*: no third-party API keys, and no server secrets, in any environment, because there is no server.

```
VITE_MSAL_CLIENT_ID
VITE_MSAL_TENANT_ID
VITE_MSAL_REDIRECT_URI
VITE_ALLOWED_EMAILS         # optional allowlist on top of the tenant check; empty = tenant-only
```

---

## 11. Acceptance criteria (BRD §16) — what "finished" means

The build is complete when all of these are demonstrably true. They are the phase-5 exit gate.

1. Any custom range updates every card, table, and chart on all eight tabs, recalculated client-side from `public/data` for that exact range — never interpolated from monthly snapshots.
2. A comparison range correctly recomputes every % change (channel health table, the three period-comparison blocks, Total Leads).
3. A range matching a full calendar month matches the published static dashboard for that month within ±1%.
4. Zoho figures always exclude Partner, Referral, and ZoomInfo — for every range.
5. LinkedIn metrics display only for ranges fully covered by upload data; partial or uncovered ranges show an explicit gap state, never a zero or a stale carry-forward.
6. No API credentials in code, client bundle, network calls, or `public/data`.
7. Each source's "last synced" timestamp matches the most recent commit touching its JSON file.
8. The CMO can complete a LinkedIn XLS handoff and request an out-of-schedule sync without developer help, using the runbook.
9. **(New, pivot-specific)** `public/data/zoho-crm.json` contains no `notes` field and no other lead free-text, in any commit, ever — verified by schema (`.strict()`, field absent) and by `scan:secrets`/a dedicated PII check in CI.
10. **(New, pivot-specific)** The CMO has explicitly signed off on the TAD §16.4 residual-exposure trade-off (or host-level password protection has been added) before production launch.
