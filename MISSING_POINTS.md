# Missing Points — TechnoRUCS CMO Dashboard

*Full-codebase audit against `TASK.md` / `CHECKLIST.md`, run 2026-08-14; re-verified the same day after the out-of-band **TAD v1.2 §0A / ADR-015** access-model change (authentication removed, role-selection dialog added), then again after the Overview tab (items 3.2-3.6) was built.*
*Baseline verified green at latest re-audit: `npm run typecheck` ✓, `npm run lint` ✓, `npm run scan:secrets` ✓, `npm test` 303/303 across 50 files ✓.*

**Status snapshot:** Phase 0 (18/18, re-verified post-ADR-015) ✅ · Phase 1 (31/31) ✅ · Phase 2 (24/24) ✅ · Items 3.1-3.6 ✅ (Overview tab complete) · **The other six tabs (Leads/Website/SEO/Email/LinkedIn/Total Leads) plus all of Phase 4/5 are still missing.**

---

## 1. Checklist hygiene — resolved 2026-08-14

The stale session-state/progress-table entries found in the original audit were fixed by the ADR-015 session: session state now reads Phase 3 1/44, last completed 3.1 (+ ADR-015), next item 3.2; progress table matches; the former "real Entra credentials" blocker is recorded as **resolved by removal**. One housekeeping point remains: **the ADR-015 changes are still uncommitted** (staged deletions + unstaged modifications across TASK/CHECKLIST/Docs/src) — per protocol §6.3 they should be committed as one tight group.

## 2. Phase 3 — Remaining tabs (38 items open: 3.7–3.44)

~~All seven tabs besides Ad Campaigns are still placeholder pages~~ **Overview is now real** (`src/routes/overview.tsx` + `src/viewmodels/overview.ts`, items 3.2-3.6, built 2026-08-14). Six tabs remain placeholder pages: `src/routes/{leads,website,seo,email,linkedin,totalLeads}.tsx`.

**Missing view models** — `src/viewmodels/adCampaigns.ts` and `overview.ts` exist:
- `leads.ts`, `website.ts`, `seo.ts`, `linkedin.ts`, `totalLeads.ts`

**Overview's build also added two pieces the other tabs can reuse:** `src/data/loadConfig()` (fetch+Zod-parse for `public/data/config/*.json` — nothing read config files before this) and `src/lib/channels/gsc.ts`'s brand/non-brand classification (`nonBrandClicks`/`brandClickShare` on `GscSummary`, config-driven at render time) — item 3.28 (SEO tab) needs the same computation and should call the same function rather than re-implementing it.

**Per tab:**
- ~~**Overview (3.2–3.6)**~~ **Done.** Three documented, deliberate deviations from the wireframe (none are bugs — full reasoning in `overview.ts`'s header comment and the CHECKLIST item notes): Meta Conversations' campaign count is the real computed **9**, not the wireframe's "8"; two of five channel-health status tags read "Action needed" where the wireframe hand-labelled "Monitor" (the already-tested threshold engine, item 1.18, mechanically disagrees with the wireframe's manual judgement call); Meta Ads' Impressions/CPM MoM percentages land ~0.2-0.3pp off the wireframe (May's impressions was only ever stated as "~138K"). LinkedIn's May comparison is a genuine coverage gap (no real May upload exists in the fixture, by item 1.27's own deliberate design), not a missing feature.
- **Leads (3.7–3.16):** view model with no-notes guarantee (P3′ contract test); all status cards **including zero-count** Contact in Future & Junk (the BRD v2.1 §7.1 bug); contact rate; source breakdown bars; Meta-Ads-only status donut; daily inbound stacked bars incl. zero days; **sales-rep table with zero-assignment rows from `config/sales-reps.json`**; contacted-vs-attempted per-rep chart; intent-bucket "not yet classified" panel (3.16 is `[!]` blocked on TAD §16.1 — build the state, not a classifier).
- **Website (3.17–3.25):** eight overview cards; `totalUsers` non-additive handling; daily sessions area chart; channel breakdown + quality chart; top sources table; **AI-referral panel** (chatgpt/copilot/perplexity); top pages with `config/page-types.json` tags; landing-entry/country/device panels; user-journey panel with top-N fallback.
- **SEO (3.26–3.33):** eight overview cards; impression-weighted avg position end-to-end; **brand vs non-brand from `config/brand-terms.json` at render time**; `DataAsOfBanner` reading `latestRecordDate` (not `lastSyncedAt`); click-generating queries table; zero-click table with Critical/High priority + gap-to-page-1; pages/countries/devices tables; backlinks placeholder panel.
- **Email (3.34):** static "not yet connected" state, range-independent.
- **LinkedIn (3.35–3.40):** eight overview cards; **coverage gate** (`requires-full-coverage` → `PartialDataWarning`, never zeros/carry-forward — this is BRD §16 criterion 5); competitor comparison table with verdicts; three daily trend charts; post-performance list (engagement % = (clicks+reactions+comments)/impressions); audience profile (seniority/job function/visitor industry/company size).
- **Total Leads (3.41–3.44):** comparison **required** with labelled fallback; headline comparison cards; per-period campaign breakdown with totals rows; grouped period-comparison bar chart.

**Phase 3 gate blockers:**
- Reconciliation golden files exist only for **June** (`tests/reconciliation/june-2026.golden.json`) — gate requires May, June, **and** July. **Partial progress:** May's Meta Ads/GA4/GSC/Zoho headline totals are now real (reconciled for Overview's items 3.2-3.6, verified in `src/viewmodels/overview.test.ts`), but there is no dedicated `may-2026.golden.json`/`test:recon` coverage for May the way June has — that formal golden file is still a real gap. July is entirely untouched, still placeholder-only.
- Walk all eight tabs at three arbitrary ranges (no bare `0`, no unlabelled comparison, no missing zero-count row).

## 3. Phase 4 — Rules & narrative (19 items, all open)

- **`src/lib/rules/` does not exist** — no `Flag` type, no pure `(viewModel, thresholds) => Flag[]` engine (4.1), and none of the 12 rules: cost/conv outlier, spend-no-conversions, audience-overlap, stuck-in-attempted, owner concentration, zero meetings, GA4 paid no-attribution, suspected-bot country, brand dominance, zero-click opportunity, competitor-lead, channel degraded (4.2–4.13).
- **`src/lib/narrative/` does not exist** — no default templates for every rule (4.14, the property that makes the design safe), no `{placeholder}` renderer through the metric registry (4.15), no `narratives.json` loader keyed by flag ID with silent fallback (4.16).
- No `NarrativeBlock` / `ActionList` / `FlagCallout` components (4.17); no narrative wiring into the seven data tabs (4.18); no arbitrary-range narrative regression test (4.19, the ADR-004 guard).
- `public/data/narratives.json` doesn't exist (schema does) — fine pre-ingestion, but the app must demonstrably render narratives without it (Phase 4 gate: delete file → narratives still render).

## 4. Phase 5 — Ingestion contract & hardening (25 items open)

**Docs (missing entirely):**
- `Docs/COWORK_SYNC_SPEC.md` (5.1–5.3) — ingestion contract, `Modified_Time` lookback rule, ratio-decomposition worked examples, explicit `notes`-never-committed rule.
- `Docs/RUNBOOK.md` (5.22) — CMO plain-language operations guide.

**Scripts/CI:**
- `scripts/check-sync-timestamps.mjs` (5.6) — BRD §16 criterion 7 — missing (CI already checks out with `fetch-depth: 0` in anticipation).
- CI job for `validate:data` + `check-sync-timestamps` on PRs touching `public/data/**` (5.7) — CI currently runs only typecheck/lint/test/scan:secrets.
- Validation gates (5.5) missing from `scripts/validate-data.mjs` — only the ajv schema-validation baseline exists; not implemented: missing `meta`, empty-records-where-data-existed, `latestRecordDate` moving backward, row-count drop >50%, **explicit `notes`/free-text field check in `zoho-crm.json`** (also required by TASK.md §11 item 9's "dedicated PII check in CI").

**LinkedIn conversion module (5.8–5.11):** `scripts/linkedin/convert.ts`, coverage-from-sheet-dates rule, `convert:linkedin` CLI wrapper, and committed fixture XLS files + tests — none exist.

**App hardening:**
- `src/data/health.ts` `getHealthSnapshot()` (5.12), `LastSyncedBadge` with cadence thresholds from config (5.13), badge on all seven data tabs (5.14).
- React error boundaries per tab section (5.15); loader failure isolation end-to-end test (5.16).
- Performance budgets measured & recorded: p95 fetch+parse < 800 ms, p95 aggregate < 150 ms (5.17); 12-month range change within 3 s end-to-end (5.18).
- Responsive pass — sidebar drawer, KPI reflow, no body scroll at 768 px (5.19).
- Accessibility pass — keyboard-navigable picker/sidebar, focus rings, text+colour status, chart/table pairing (5.20).
- Vercel Analytics + Speed Insights, no PII in logs (5.21).
- Acceptance pass BRD §16 1–8 + TASK.md §11 9–10 (5.23); production exposure verify (5.24, `[!]` blocked on the CMO's §16.4/§16.5 decision — host-level password protection closes both); `scan:secrets` against real data (5.25); end-to-end Cowork pipeline observation (5.26).

## 5. External / data gaps (tracked, not code bugs)

- **No real data in `public/data/`** — only `.gitkeep` + config seeds (item 0.8's structure is complete and verified). No Cowork run has ever written channel JSON; the app currently runs against fixtures only. BRD §16 criteria 3, 7, 8 are undemonstrable until this changes. Per TASK.md §8, production data must not be invented in its place.
- **No access control anywhere (post-ADR-015)** — the app no longer authenticates anyone; the role dialog is a label, not a gate. BRD §15.2 is formally UNMET and flagged as such. The **only** remaining protection for lead data is ADR-012/P3′ (`notes` never written into `public/data`) — any weakening of that schema is now a privacy incident, not a lint failure. Recommended mitigation: host-level deployment password protection (one Vercel setting), which closes TAD §16.4 and §16.5 together — **not enabled; CMO decision pending (item 5.24).**
- `xlsx@0.18.5` carries a high npm-audit advisory (accepted: build-time CLI only, no fix on npm).
- Bundle > 500 kB warning — code-splitting deferred to Phase 5 perf pass.
- `reach`/`frequency` render `—` for multi-day ranges — permanent architectural consequence (documented items 2.15/2.16), not fixable.

## 6. Small known follow-ups (recorded in checklist notes)

- Item 2.21: cost/conversation chart shows the account-average reference as **text**, not yet a Recharts `ReferenceLine` visual.
- `config/sales-reps.json` seeded with only the four doc-referenced names; extend as real data surfaces.
- `thresholds.json` is explicitly a starting point (TAD §16.2 sign-off pending).
- ADR-015 working-tree changes are verified green but **uncommitted**.

## 7. Deferred by decision (do not build)

Lead-intent classification (TAD §16.1) · staleness-threshold sign-off (§16.2) · host-level deployment password protection as required mitigation (§16.4 + §16.5) · wireframe refresh for the new picker (§16.3) · Instantly.ai email · Ubersuggest/backlinks · in-app LinkedIn upload UI · UTM parameters on Meta Ads URLs (ads team).
