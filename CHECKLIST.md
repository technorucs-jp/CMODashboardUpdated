# CHECKLIST — TechnoRUCS CMO Dashboard

Companion to `TASK.md`. **Read `TASK.md` first.** Work top to bottom, one item at a time.

*Rewritten 2026-08-10 against TAD v1.1 §0 (ADR-011–014) — Vite + React SPA, no application backend. Item numbering is preserved from the pre-pivot checklist for continuity; wording is updated wherever Next.js/server/API concepts no longer apply. Wireframe-derived figures and business logic are unchanged — this was a hosting/runtime pivot, not a requirements change.*

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
Current phase:        0 — Foundation — COMPLETE (18/18). Starting Phase 1.
Last completed item:  0.18
Next item:            1.1
Blocked on:           Nothing blocking Phase 1. Still open, none of them phase-blocking yet:
                      real Entra credentials (VITE_MSAL_CLIENT_ID/TENANT_ID — needs CMO/IT admin
                      to complete an app registration; sign-in can't be end-to-end tested until
                      then), TAD §16.1 (lead intent classification, needed by Phase 3),
                      §16.2 (staleness thresholds, needed by Phase 5), §16.4 (residual /data
                      exposure sign-off, needed by Phase 5).
Notes:                Vite 8 (rolldown-based) scaffolded via `create-vite@latest --template react-ts --eslint`;
                      the react-swc-ts template no longer exists in this create-vite version, react-ts used
                      instead (plain @vitejs/plugin-react, not SWC — functionally equivalent for our purposes,
                      not a tracked deviation since TASK.md §4 only pins `vite@5+` generically).
                      tsconfig.app.json path alias uses `paths` without `baseUrl` (TS 6.0 deprecates baseUrl).
                      xlsx@0.18.5 has an unpatched npm-registry advisory (accepted, see item 0.3 note).
                      P5/P6 ESLint rules verified working (item 0.6 note has detail on the import-boundary approach).
                      Vitest needed `pool: 'threads'` — the default `forks` pool hangs in this sandboxed dev
                      environment (item 0.11 note).
                      Added a `rewrites` block to vercel.json (not originally its own checklist item) — a
                      static host needs an explicit SPA fallback or direct navigation to any route but `/`
                      404s; discovered while verifying item 0.18 locally.
                      Live at https://technorucs-cmo-dashboard.vercel.app (GitHub-connected, auto-deploys
                      on push to main). 29 tests across 4 files, all green.
Last updated:         2026-08-10
```

---

## Progress

| Phase | Items | Done | Gate |
|---|---|---|---|
| 0 — Foundation | 18 | 18 | ✅ |
| 1 — Data spine | 31 | 0 | ⬜ |
| 2 — Pickers & first tab | 24 | 0 | ⬜ |
| 3 — Remaining tabs | 44 | 0 | ⬜ |
| 4 — Rules & narrative | 19 | 0 | ⬜ |
| 5 — Ingestion & hardening | 26 | 0 | ⬜ |

---

# Phase 0 — Foundation

*Goal: only an authenticated `@technorucs.com` user can reach any route (client-side gate — TAD §0.4/ADR-013), and all eight tabs navigate.*
*Read first: TAD §0 (all of it), §3, ADR-001 (for the auth rationale, now implemented client-only per ADR-013).*

- [x] **0.1** Scaffold a Vite + React 19 project, TypeScript `strict: true`, path alias `@/*` → `src/*`, `react-router-dom` installed.
  *Verify:* `npm run dev` serves a page; `npx tsc --noEmit` exits 0.
      > `react-router-dom` lands in 0.2 with the other runtime deps, not here — this item scaffolded the base project only. Used `create-vite@latest --template react-ts --eslint` (Vite 8/rolldown); `react-swc-ts` template is gone from current create-vite. Path alias via `paths` only (no `baseUrl` — deprecated in TS 6.0).

- [x] **0.2** Install runtime deps: `react-router-dom`, `@azure/msal-browser`, `@azure/msal-react`, `zod`, `@tanstack/react-query`, `recharts`, `react-day-picker`, `date-fns`.
  *Verify:* `npm ls react-router-dom @azure/msal-browser @azure/msal-react zod @tanstack/react-query recharts react-day-picker date-fns` resolves all eight with no `UNMET`.
      > Resolved versions: zod@4.4.3 (v4 API — `.strict()` semantics differ slightly from v3, will confirm when schemas land in Phase 1), react-day-picker@10.0.1, react-router-dom@7.18.2. All current-major, no substitutions.

- [x] **0.3** Install dev deps: `vitest`, `@testing-library/react`, `jsdom`, `ajv`, `zod-to-json-schema`, `xlsx`, ESLint + TS plugin.
  *Verify:* `npm ls vitest ajv zod-to-json-schema xlsx` resolves all four.
      > `npm audit` flags `xlsx@0.18.5` (high — SheetJS prototype pollution / ReDoS advisories, no fix published to npm; SheetJS ships patches via their own CDN, not the registry). Accepted per TASK.md §4 — this package is used only in `scripts/linkedin/convert.ts`, a Node CLI tool processing the CMO's own manually-exported XLS files, never in the browser bundle or on untrusted network input. Not a STOP condition (package is available and mandated by name); flagged here for visibility, not silently ignored.

- [x] **0.4** Add npm scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:recon`, `validate:data`, `schemas:build`, `scan:secrets`.
  *Verify:* `npm run typecheck && npm run lint` both exit 0.
      > Scripts were added in item 0.1's package.json edit; `test`/`test:recon`/`validate:data`/`schemas:build`/`scan:secrets` reference files that don't exist until later items (0.16, 1.9, 5.4) — expected, this item's verify only checks typecheck+lint.

- [x] **0.5** ESLint rule enforcing **P5**: ban `new Date(` and `Date.parse(` outside `src/lib/time/**`.
  *Verify:* add `const d = new Date('2026-01-01')` to a scratch file in `src/lib/metrics/` → `npm run lint` fails. Remove it → passes.

- [x] **0.6** ESLint rule enforcing **P6**: `src/lib/**` may not import `src/routes/**`, `src/components/**`, `src/data/**`, `src/auth/**`, or `react`.
  *Verify:* add `import { useState } from 'react'` to a file in `src/lib/` → `npm run lint` fails. Remove it → passes.
      > Also verified the app-layer bans with a relative import (`../../components/_scratch`) — failed as expected. Implemented via core ESLint `no-restricted-imports` `patterns` (glob match on the raw specifier string), not `eslint-plugin-import`'s resolver-based `no-restricted-paths` — tried that first, it silently no-ops without a configured TS resolver plugin, so the glob approach is more robust here and adds no extra dependency. Both 0.5 and 0.6 landed in the same `eslint.config.js` edit/commit (5f5cec6) since they're two rules in one config file — noted here rather than an empty second commit.

- [x] **0.7** `vercel.json` (or the equivalent config for whatever static host is used) with a `Cache-Control` header rule for `public/data/**`. This replaces the old `next.config.ts` concern — there is no server bundle to trace files into.
  *Verify:* `grep -A3 "/data/(.*)" vercel.json` shows a headers entry. (There is no "works locally, 500s in prod" failure mode anymore — the risk this used to guard against doesn't exist without a server — but caching still needs to be set explicitly or every range change re-downloads the full channel file.)
      > Verify wording corrected from a literal `"public/data"` grep to `"/data/(.*)"` — Vite serves everything under `public/` from the site root, so the served URL path is `/data/...`, not `/public/data/...`; the `vercel.json` `source` pattern must match the served path, not the on-disk path.

- [x] **0.8** Create `public/data/` with a `.gitkeep` and `public/data/config/`. Add `public/data/README.md` stating plainly that this directory is **deliberately public** (TAD ADR-012/014 — the opposite of the pre-pivot rule) and therefore must never contain `notes` or any other lead free-text; cross-reference the `.strict()` schema that enforces it (item 1.4).
  *Verify:* `test -d public/data` exits 0; `grep -qi "never" public/data/README.md` matches.

- [x] **0.9** Extract design tokens from `static-preview.html` into `src/styles/tokens.css`: base `#0d1117` (per TAD P8 / TASK.md §3 — note in the file header that the actual reference file uses `#0f0f0f`, a documented wording slip, not a design change), surface/border/text neutrals, status colours (Leading, Good, Monitor, Action needed), channel accent hues.
  *Verify:* `grep -c '^\s*--' src/styles/tokens.css` ≥ 15; no literal hex values in any component file (`grep -rn '#[0-9a-fA-F]\{6\}' src/components/` returns nothing).
      > 47 custom properties. Of the 8 channel accent hues, 5 are confirmed against `01-overview-june-a.jpg` (Ad Spend, Total Leads, Sessions, Organic Clicks, New Followers); the remaining 3 keep their reference-file values but are unassigned to a specific tab until that tab is built (Phase 2/3) — see the file's header comment. Also replaced `src/index.css`'s scaffold boilerplate (a light/dark-themeable demo-page stylesheet from `create-vite`'s default template) entirely — it conflicted with P8's single frozen dark theme; it now just imports `tokens.css` and sets `body` from it.

- [x] **0.10** `src/auth/msalConfig.ts` — `PublicClientApplication` config built from `VITE_MSAL_CLIENT_ID` / `VITE_MSAL_TENANT_ID` / `VITE_MSAL_REDIRECT_URI`. Browser-only PKCE flow. No client secret anywhere (public clients don't have one — if you find yourself adding one, you've misread ADR-013).
  *Verify:* `src/auth/msalConfig.ts` exports a config object with no `clientSecret`/`client_secret` key; `grep -rn "clientSecret" src/` returns nothing.
      > `CacheOptions.storeAuthStateInCookie` doesn't exist in `@azure/msal-browser@5.18.0` (removed — it was an IE11 workaround); dropped, `cacheLocation: 'sessionStorage'` alone is sufficient for the "don't outlive the tab" goal. Real Entra `clientId`/`tenantId` values come from an app registration — an external, non-repo step (`.env.example` documents this); local/CI runs without them just log a warning and can't sign in.

- [x] **0.11** `src/auth/isAllowedAccount.ts` — pure predicate: reject any account whose token tenant/verified domain ≠ `technorucs.com`, and (if `VITE_ALLOWED_EMAILS` is non-empty) not on the allowlist.
  *Verify:* unit test — predicate returns `false` for a mock claims object with domain `gmail.com`, `true` for `technorucs.com`.
      > `npm test` required switching Vitest's pool from the default `forks` to `threads` in `vite.config.ts` — `forks` hangs waiting for a worker in this sandboxed dev environment (looks like restricted `child_process.fork`). Not a project-specific decision, just an environment accommodation; flagged in case it needs revisiting on a different machine/CI runner.

- [x] **0.12** `src/auth/AuthGuard.tsx` — wraps the protected route tree; no MSAL account or a rejected account (via 0.11) renders/redirects to `/login` instead of children. This is the client-side replacement for the old `middleware.ts` — there is no server-side matcher, so this must wrap **every** protected route, not rely on a single file catching all paths.
  *Verify:* render test — `AuthGuard` with no active MSAL account renders the login route content, not its children; with a mock `technorucs.com` account, children render.
      > Tested with `@azure/msal-react`'s `useIsAuthenticated`/`useMsal` mocked via `vi.mock` + `vi.hoisted` — also covers the case an authenticated-but-wrong-tenant account is rejected (item 0.11's predicate wired in), not just "no account at all".

- [x] **0.13** `/login` route with a single "Sign in with Microsoft" action (`msalInstance.loginRedirect()`). No anonymous data surface.
  *Verify:* render the `/login` route in isolation — contains no metric values anywhere in the output.

- [x] **0.14** Root layout route (`Sidebar` (8 items + source sublabels: Meta, Zoho, GA4, GSC, Instantly, Page, Meta) + `TopBar`) via `react-router` nested routes/`Outlet`. Mounted once so state survives navigation.
  *Verify:* navigating between two child routes does not remount the sidebar (React DevTools, or a `console.count` in a `useEffect` with `[]` deps fires once).
      > Verified by DOM node identity instead of a render counter — same `TopBar`/`Sidebar` DOM nodes before and after a simulated nav click, which can only hold if the layout route (and therefore its children) was never unmounted/remounted, only the `<Outlet/>` content swapped.

- [x] **0.15** All eight routes exist and render a placeholder, each wrapped in `AuthGuard`: `/overview`, `/ad-campaigns`, `/leads`, `/website`, `/seo`, `/email`, `/linkedin`, `/total-leads`. `/` redirects to `/overview`.
  *Verify:* a router test navigates to each of the eight with a mocked authenticated `technorucs.com` MSAL account and finds a distinct placeholder heading per route; the same test with no account renders the login route for all eight instead.
      > 18 cases (`it.each`) covering all eight routes × authenticated/unauthenticated, plus `/` → `/overview` redirect in both auth states. Manually confirmed via `npm run dev` too.

- [x] **0.16** `scripts/scan-secrets.mjs` — scans `public/data/` and `src/` for bearer tokens, `AKIA`, PEM headers, `client_secret`, long base64 blobs. Exits non-zero on match.
  *Verify:* `npm run scan:secrets` exits 0; add `client_secret=abc123def456` to a scratch file → exits 1. Remove it.

- [x] **0.17** GitHub Actions CI: `typecheck`, `lint`, `test`, `scan:secrets` on every PR.
  *Verify:* `.github/workflows/ci.yml` exists and lists all four steps.
      > Checked out with `fetch-depth: 0` from the start (Phase 5 item 5.7 needs it for `check-sync-timestamps.mjs` — no reason to shallow-clone now and edit this file again later).

- [x] **0.18** Commit and push. Confirm the static deploy (Vercel or equivalent) serves the login screen to an anonymous visitor at `/overview`, and record in *Session state* whether host-level deployment password protection (TAD §16.4) is enabled yet — it is not required to pass this gate, but its absence must be a visible, tracked fact, not a silent gap.
  *Verify:* preview URL, visited anonymously, renders the client-side login screen — not dashboard content. (This does **not** mean `public/data/*.json` is unreachable by direct URL — see TAD §16.4; that is a documented trade-off, not a bug in this item.)
      > Pushed to `https://github.com/technorucs-jp/CMODashboardUpdated.git` (`main`); Vercel project `jp14/technorucs-cmo-dashboard` linked, GitHub-connected (auto-deploys on push to `main` from now on), and manually deployed once to confirm: **https://technorucs-cmo-dashboard.vercel.app**. Confirmed: `curl .../overview` → 200 (the `vercel.json` SPA rewrite works on the real host, not just locally); `curl .../data/README.md` → 200, serving the actual file (expected per ADR-012/014 — a live demonstration of the documented trade-off, not a bug). The actual auth-*redirect* can't be observed via `curl` against a client-rendered SPA (proven instead by `AppRoutes.test.tsx`'s 18 cases) and sign-in itself can't be end-to-end tested yet — **`VITE_MSAL_CLIENT_ID`/`VITE_MSAL_TENANT_ID` are not set as Vercel env vars**, because no real Entra app registration exists yet (still needs the CMO/IT admin, TASK.md §8 "you need a credential" territory — narrower gap now than "no deployment at all"). Host-level deployment password protection (TAD §16.4) is **not** enabled — recorded here, not silently skipped; revisit before Phase 5's production sign-off (item 5.24).

**Phase 0 gate: ✅ PASSED (2026-08-10).** `npm run typecheck && npm run lint && npm run scan:secrets && npm run build` all green; live deployment at https://technorucs-cmo-dashboard.vercel.app confirms the SPA rewrite and public `/data` behave in production exactly as they do locally. Outstanding, non-blocking for Phase 1: real Entra credentials (so sign-in actually works end-to-end) and the TAD §16.4 host-protection decision — both tracked in Session state, neither gates further phases.

---

# Phase 1 — Data spine

*Goal: metric unit tests and the June 2026 reconciliation test pass against fixtures — before a single chart exists.*
*Read first: TAD §0.3/§0.5 (ADR-012, ADR-014), §7 (schemas — minus `notes`), §9 (computation core), ADR-007, ADR-008, ADR-009, and TASK.md §9 (traps).*

### Schemas and config

- [x] **1.1** `public/data/config/` seed files: `brand-terms.json` (technorucs + misspellings), `page-types.json` (path → Landing/Blog/Service/Conversion/Trust/Talent/About/Trust), `linkedin-competitors.json`, `thresholds.json` (BRD Appendix A), `sales-reps.json` (active roster).
  *Verify:* all five parse as JSON; `thresholds.json` contains `leading`, `good`, `monitor`, `actionNeeded`.
      > `sales-reps.json` seeded with the four names the docs actually reference (Gopinath, Rathish, Mohan, Ram — BRD §7.3's concentration/zero-assignment findings) rather than an invented full roster; add more as real data surfaces. `thresholds.json` explicitly notes it's a starting point per BRD Appendix A's own heading, same "tune with CMO" spirit as TAD §16.2 — not re-litigated as a new open item, just not pretending it's final.

- [x] **1.2** Zod schema for the common envelope: `schemaVersion`, `meta` (`channel`, `lastSyncedAt`, `earliestRecordDate`, `latestRecordDate`, `syncSource`, `coworkRunId`, `rowCounts`).
  *Verify:* unit test — a file missing `meta.latestRecordDate` fails parse with a readable error.
      > Added an ESLint allowance for `^_`-prefixed unused vars/args — the idiomatic way to test field-*absence* (destructure a field out, assert the rest still validates or now fails) is exactly the pattern P1/P3′ tests need throughout Phase 1, and it would otherwise trip `no-unused-vars` on every such test.

- [x] **1.3** Zod schema `meta-ads.json`: `dimensions.adSets[]` + `facts[]` + `account[]`. **No `cpc`/`cpm`/`ctr`/`frequency` fields** (P1, TAD §7.3).
  *Verify:* unit test — a fact row containing `cpc` fails strict parse.
      > Confirmed `envelopeSchema.extend(...)` preserves `.strict()` on the base fields in Zod v4 — the nested `factSchema.strict()` is what actually catches `cpc`/`cpm`/`ctr`/`frequency`, tested individually.

- [ ] **1.4** Zod schema `zoho-crm.json`: one row per lead, `inquiryType` nullable. **No `notes` field at all** — `.strict()`, the field is absent from the schema entirely (TAD ADR-012/P3′, supersedes the pre-pivot "`notes` present, kept server-side" design).
  *Verify:* unit test — a row with `leadSource: "Partner"` fails validation (excluded at ingestion, must never appear); a row containing a `notes` key of any kind fails `.strict()` parse.

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

- [ ] **1.20** `tests/fixtures/` — realistic fixture for every channel covering May–July 2026, with hand-calculable totals. Derive values from the wireframe screens so reconciliation is meaningful. Fixtures mirror the **shipped** shape exactly, including the absence of `notes` (item 1.4) — fixtures are not a place to smuggle back a field the real file will never have.
  *Verify:* every fixture passes its Zod schema; `npm run validate:data -- tests/fixtures` exits 0.

- [ ] **1.21** `src/data/loader.ts` — `load(channel)`: `fetch(`${BASE_URL}data/${channel}.json`)` → Zod parse → in-memory cache for the browser session. This replaces the old `fs.readFile`-based server loader; the module-level cache now lives for the page's lifetime, not per server instance. Isolates failure to one channel.
  *Verify:* test — mocking `fetch` to return a corrupt `gsc.json` body makes `load('gsc')` throw a typed error while `load('ga4')` still succeeds.

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

### Client fetch & cache layer

*(Replaces the pre-pivot "API skeleton" section — there is no server, so there is no route handler, `ETag`, or 304 to build. The equivalent concerns — avoid redundant work, isolate per-tab failures, cache within a session — move into this plain client module + TanStack Query.)*

- [ ] **1.28** `src/data/loader.ts` `load(channel)` (built in 1.21) is the single fetch point for every channel; nothing else in the app calls `fetch()` directly against `public/data/`.
  *Verify:* `grep -rn "fetch(" src/ --include=*.ts --include=*.tsx | grep -v src/data/loader.ts` returns nothing.

- [ ] **1.29** Invalid or missing URL query params (read via `react-router`'s `useSearchParams` + Zod) fall back to current month to date rather than erroring.
  *Verify:* rendering `/leads` with no query params shows the current month's data, not an error screen.

- [ ] **1.30** Aggregate memoisation keyed on `tab:rangeSig` for the current browser session (a `Map` or `useMemo`-backed cache — there is no commit SHA available client-side, and none is needed since the memo only needs to survive the tab, not a redeploy).
  *Verify:* instrument the aggregation step; selecting the same range twice in one session skips recomputation the second time.

- [ ] **1.31** **Reconciliation harness** — `tests/reconciliation/june-2026.golden.json` with the published June figures (₹38,423 spend, 101 conversations, ₹380 cost/conv, 1,720 sessions, 65.3% engagement, 469 clicks, 54,744 impressions, 0.81% CTR, 132 new followers, 522 reactions, 49 inbound leads, 30.6% contact rate). Test selects 1–30 June and asserts within ±1%.
  *Verify:* `npm run test:recon` green.

**Phase 1 gate:** `npm test && npm run test:recon && npm run validate:data` — all green. The engine is correct before any UI exists.

---

# Phase 2 — Pickers and the first tab

*Goal: selecting any custom range recomputes every figure on Ad Campaigns, and the URL round-trips.*
*Read first: TAD §0.5 (ADR-014), §11.3–11.6 (mechanism superseded — no API contract; the UI/behaviour spec still applies), BRD §4, §6, wireframes `07-adcampaigns-*.jpg`.*

- [ ] **2.1** `DateRangePicker` — calendar + the seven presets, IST-based.
  *Verify:* selecting "Last Month" on 2026-08-10 sets `from=2026-07-01&to=2026-07-31`.

- [ ] **2.2** `ComparisonRangePicker` — off by default; options previous period / previous month / previous year / custom.
  *Verify:* enabling "previous period" for 1–30 June sets `cf=2026-05-02&ct=2026-05-31`.

- [ ] **2.3** URL parse/serialise with Zod validation, via `react-router`'s `useSearchParams`; the URL is the only range state.
  *Verify:* `grep -rn "useState.*[Rr]ange" src/` returns nothing outside the picker's transient input state.

- [ ] **2.4** Both pickers live in the root layout's `TopBar`, visible on every tab, surviving navigation across `react-router` routes.
  *Verify:* set a range on `/leads`, navigate to `/seo` — the range persists and the URL carries it.

- [ ] **2.5** Bookmark/share works: pasting a full URL into a new tab reproduces the exact view (after MSAL sign-in, since every route is behind `AuthGuard` — this is expected, not a regression; the URL itself is what round-trips, not anonymous access to it).
  *Verify:* manual — copy URL, open in a fresh session, sign in, same figures render.

- [ ] **2.6** TanStack Query provider, key `['metrics', tab, rangeSig, compareSig]`, `staleTime: Infinity`.
  *Verify:* switching away and back to a tab issues no second `fetch` call.

- [ ] **2.7** Idle prefetch of the other seven tabs' channel data (via `load()`, item 1.21) for the current range after first paint.
  *Verify:* network panel shows the other channels' JSON fetched after `/ad-campaigns` settles; a tab switch issues no new fetch.

- [ ] **2.8** `CardSkeleton` shown per card during fetch/aggregation — not a full-page spinner. Sidebar and pickers stay interactive.
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

- [ ] **2.14** `src/viewmodels/adCampaigns.ts` (client-side, was `src/server/viewmodels/` pre-pivot) — composes the Ad Campaigns view model.
  *Verify:* contract test — the returned object matches the published TS type.

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

- [ ] **2.24** Performance instrumentation: `performance.mark` around client-side aggregation; log p95.
  *Verify:* a 12-month range change completes well inside the 3-second ceiling; record the measured number in the Session state notes.

**Phase 2 gate:** pick three arbitrary ranges (including one crossing a month boundary and one single day). Every figure on `/ad-campaigns` recomputes, no zeros stand in for absent data, and the URL reproduces each view.

---

# Phase 3 — Remaining tabs

*Goal: BRD §16 criteria 1–5 pass; reconciliation green for May, June, and July.*
*Read first: BRD §5, §7–§12; wireframes for each tab.*

### Shared state components

- [ ] **3.1** `EmptyState`, `NoDataBeforeDate`, `PartialDataWarning`, `LaggingDataNotice`, `NotConnectedPanel` — used by every tab, never reimplemented per tab.
  *Verify:* each renders from a `Coverage` value; `grep -rn "No data" src/routes/` returns nothing (copy lives in the shared components).

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

- [ ] **3.7** `src/viewmodels/leads.ts` — counts and rates only; `notes` never appears anywhere in the fetched data or the view model (**P3′**) — this is now enforced two layers deep: the `.strict()` schema (item 1.4) rejects the field on parse, and this view model would have nothing to leak even if it slipped through.
  *Verify:* contract test asserts the parsed `zoho-crm.json` fixture (i.e. the exact shape the browser receives) contains no `notes` key at all; `grep` the raw fixture file for a known note string used pre-pivot → no match.

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

- [ ] **[!] 3.16** Intent bucket panel — renders the "not yet classified" state while `inquiryType` is null. **Do not implement either classifier** (TASK.md §8). Note: whichever classification path the CMO eventually picks, the resulting bucket label is all that may ever appear in `zoho-crm.json` — the underlying `notes` text stays out per item 3.7 regardless.
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
*Read first: TAD §10, ADR-004. Unaffected by the architecture pivot — this is all `src/lib/**`, framework-agnostic by construction.*

- [ ] **4.1** `Flag` type + `src/lib/rules/engine.ts` — pure `(viewModel, thresholds) => Flag[]`.
  *Verify:* engine is importable in a Node test with no React, `fetch`, or DOM global in the module graph.

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

**Phase 4 gate:** delete `public/data/narratives.json`, reload every tab — narratives still render correctly. Restore it; authored wording appears with live numbers.

---

# Phase 5 — Ingestion contract and hardening

*Goal: a Cowork run updates `public/data`, auto-deploys, and the dashboard reflects it with accurate sync badges.*
*Read first: TAD §8 (mechanism unaffected by the pivot — Cowork still writes JSON and pushes), §0.3/§0.4 (ADR-012/013, the parts of this phase that materially changed), ADR-010.*

- [ ] **5.1** `Docs/COWORK_SYNC_SPEC.md` — the ingestion contract: per-channel cadence, lookback windows, natural keys, the 12-step run algorithm, validation gates, commit message format. Must state explicitly that Cowork writes to **`public/data/`**, not a server-only `data/` root, and that `zoho-crm.json`'s `notes` field is read from Zoho for Cowork's own use (e.g. an eventual intent classifier) but is **never written into the committed file**.
  *Verify:* spec covers all five channels, every gate in TAD §8.3, and explicitly documents the `notes`-exclusion rule with the reason (TAD ADR-012).

- [ ] **5.2** Spec states Zoho's lookback keys on **`Modified_Time` as well as `Created_Time`**.
  *Verify:* explicitly documented with the reason (lead status mutates after creation — TAD D9).

- [ ] **5.3** Spec states ratios are decomposed at ingestion: GA4 `bounceRate` → `bouncedSessions`; GSC `position` → `sumPosition`.
  *Verify:* both documented with worked examples.

- [ ] **5.4** `scripts/validate-data.mjs` — ajv, every `public/data` file against `/schemas`.
  *Verify:* `npm run validate:data` exits 0 on good data, 1 on a deliberately broken file (including one with a stray `notes` field).

- [ ] **5.5** Validation gates: missing `meta`, empty records where previous run had data, `latestRecordDate` moving backward, row count drop > 50%, **any `notes` (or similarly named free-text) field present in `zoho-crm.json`**.
  *Verify:* five fixture cases each fail with a distinct message.

- [ ] **5.6** `scripts/check-sync-timestamps.mjs` — asserts each changed data file's `lastSyncedAt` is within tolerance of its commit timestamp (**BRD §16 criterion 7**). Unaffected by the pivot — this is a Git-history check, not a server check.
  *Verify:* passes on a good commit; fails on a file whose `lastSyncedAt` is a week off.

- [ ] **5.7** CI job running `validate:data` and `check-sync-timestamps` on PRs touching `public/data/**`, checked out with `fetch-depth: 0`.
  *Verify:* workflow includes both and the full-history checkout (shallow clone breaks 5.6).

- [ ] **5.8** `scripts/linkedin/convert.ts` — pure `convertLinkedInExport(sheets) => {data, coverage, warnings}`. No fs, no network, no globals. (Runs under Node as a build/CI-time tool; this is unrelated to the app itself having no server.)
  *Verify:* unit-testable with in-memory sheet objects; no `fs` import in the module.

- [ ] **5.9** Coverage derived from actual min/max dates in the sheets, not the filename.
  *Verify:* test — a file named "june" containing 3 Jun–28 Jun data yields coverage 2026-06-03..2026-06-28.

- [ ] **5.10** CLI wrapper `npm run convert:linkedin -- <paths>` handling file I/O and the `meta.uploads[]` append, writing into `public/data/linkedin.json`.
  *Verify:* running against fixture XLS files produces a schema-valid `linkedin.json` in `public/data/`.

- [ ] **5.11** Committed fixture XLS files (Followers, Visitors, Content) + conversion tests.
  *Verify:* `npm test` covers the conversion path.

- [ ] **5.12** A client-side data-health view, `src/data/health.ts` (`getHealthSnapshot()`) — per-channel `lastSyncedAt`, `latestRecordDate`, row counts, computed `stale` boolean, read directly from each channel's already-loaded `meta` block via `load()` (item 1.21). Replaces the pre-pivot `GET /api/health/data` route — there is no server to expose it from, so this is a pure function the `LastSyncedBadge`s (and, optionally, a simple authenticated `/data-health` debug route) call directly in the browser.
  *Verify:* unit test — given five loaded channel datasets, returns all five with correct `stale` flags; a fixture with an old `lastSyncedAt` flags `stale: true`.

- [ ] **5.13** `LastSyncedBadge` — neutral within cadence, amber past 2×, red past 4×, absolute IST timestamp on hover. Thresholds in config.
  *Verify:* three fixtures render the three states; changing the config value changes the threshold with no code edit.

- [ ] **5.14** Badge placed on every tab next to its data-source subtitle, not only Overview.
  *Verify:* present on all seven data tabs.

- [ ] **5.15** React error boundaries per tab section — one failing chart cannot blank a page.
  *Verify:* force a throw in one chart; the rest of the tab still renders.

- [ ] **5.16** Loader failure isolation end-to-end: one corrupt channel file degrades that channel only.
  *Verify:* mock a corrupt `gsc.json` response → SEO shows an error state, other tabs unaffected.

- [ ] **5.17** Performance budget measured, redefined for a client-only architecture (no server, so no "cold Node start" or "304" — those don't exist): p95 first `fetch`+parse per channel < 800ms; p95 aggregate against an already-loaded channel < 150ms.
  *Verify:* record measured numbers in the Session state notes. Investigate before shipping if either exceeds budget.

- [ ] **5.18** 12-month range change stays inside the 3-second ceiling (BRD §15.3), measured as client CPU time end-to-end (fetch, if not cached, + parse + aggregate + render).
  *Verify:* measured and recorded.

- [ ] **5.19** Responsive pass: sidebar collapses to a drawer, KPI rows reflow to two columns, tables scroll inside their own container.
  *Verify:* at 768px the page body has no horizontal scroll.

- [ ] **5.20** Accessibility pass: keyboard-navigable picker and sidebar, visible focus rings on dark ground, status conveyed by text as well as colour, every chart paired with its table.
  *Verify:* full keyboard traversal of one tab without a mouse; no colour-only status.

- [ ] **5.21** Vercel Analytics + Speed Insights enabled (SPA-mode client packages — no server integration needed). No PII in logs.
  *Verify:* browser console/network logs on an aggregation error carry channel + range only — no lead content.

- [ ] **5.22** `Docs/RUNBOOK.md` for the CMO, plain language: trigger an out-of-schedule sync; hand over a LinkedIn XLS; read the sync badges; edit brand terms / page types / competitors / thresholds; sign in via Microsoft; who to contact when a channel goes stale.
  *Verify:* a non-technical reader can follow it without reading any other document.

- [ ] **5.23** Full acceptance-criteria pass against BRD §16 items 1–8 **and** TASK.md §11's items 9–10 (`notes` exclusion; CMO sign-off on the §16.4 residual exposure).
  *Verify:* each of the ten demonstrated and recorded.

- [ ] **[!] 5.24** Production auth and data-exposure verified: a non-`technorucs.com` account is rejected by `AuthGuard`; a direct request to `https://<prod>/data/zoho-crm.json` **is expected to return the file** (there is no server to 404 it, per TAD §16.4) — the check that matters is that the returned JSON contains **no `notes` key and no other lead free-text**, verified by `curl … | grep` for a known note string with no match. This item cannot be marked `[x]` until the CMO has explicitly recorded a decision on TAD §16.4 (accept the exposure as-is, or require host-level password protection first) — leave it `[!]` with that blocker noted until then.
  *Verify:* `curl https://<prod>/data/zoho-crm.json | grep -i "how does the software work"` (or another known pre-pivot note fragment) returns no match; CMO's §16.4 decision is recorded in this file's Session state notes.

- [ ] **5.25** `npm run scan:secrets` green against the real `public/data` (BRD §16 criterion 6).
  *Verify:* exits 0.

- [ ] **5.26** End-to-end pipeline test: a real Cowork run writes `public/data`, pushes, the static host deploys, the dashboard reflects it with correct badges.
  *Verify:* observed once, start to finish.

**Phase 5 gate:** all eight BRD §16 acceptance criteria plus TASK.md §11's items 9–10 demonstrated, and 5.24's CMO decision plus 5.25 green in production.

---

## Deferred — do not build without a decision

| Item | Blocked on | Where |
|---|---|---|
| Lead intent classification (Zoho picklist vs. Cowork classifier) | CMO | TAD §16.1, item 3.16 |
| Staleness thresholds sign-off | CMO — defaults implemented, confirmation pending | TAD §16.2, item 5.13 |
| Host-level deployment password protection as a required (not optional) mitigation for the residual `public/data` exposure | CMO | TAD §16.4, item 5.24 |
| Wireframe refresh for the new picker | Not a blocker; update the wireframe from the Phase 2 build | TAD §16.3 |
| Instantly.ai email integration | Out of scope this phase | BRD §10 |
| Ubersuggest / backlinks | Connector unreliable; out of scope | BRD §9.3 |
| In-app LinkedIn upload UI | There is no server to hold a GitHub write token even if this were approved — would require reintroducing a backend, which is a bigger decision than the upload feature itself | TAD ADR-003, §0.1 |
| UTM parameters on Meta Ads URLs | **Ads team, not the developer** — but until it lands, GA4 paid attribution is structurally zero | BRD §8.3 note |
