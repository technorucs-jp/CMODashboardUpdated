**TechnoRUCS**

**CMO Dashboard — Real-Time Platform**

Technical Requirements Document (TRD)

Version 1.0 | August 10, 2026

Source BRD: TechnoRUCS_CMO_Dashboard_RealTime_Requirements_v2.1.md

Prepared for: Development Team

Status: Draft — items in Section 12 are open decisions, not yet resolved by the CMO

---

**1. Purpose**

This TRD translates the Business & Functional Requirements Document (BRD v2.1) into an implementable technical specification: system architecture, data schemas, the Cowork sync pipeline, frontend structure, and non-functional targets. It does not restate business rationale already covered in the BRD — see the BRD for the "why" behind each requirement; this document covers the "how."

Every section below cross-references the BRD section it implements, so a reviewer can trace each technical decision back to a business requirement.

**2. System Architecture**

**2.1 Architecture summary**

The system has three independent parts that never call each other synchronously at request time:

1. **Ingestion (Claude Cowork job)** — runs on a schedule, pulls data from four live MCP connectors (Meta Ads, Zoho CRM, GA4, GSC), converts one manually-uploaded LinkedIn XLS, writes day-granular JSON to `/data`, and pushes to `main`.
2. **Storage (Git-versioned JSON)** — the `/data` folder in the `technorucs-jp/technorucs-cmo-dashboard` repository. This is the system's only data store; there is no database.
3. **Presentation (web application)** — a statically-deployed (Vercel) frontend that reads the JSON shipped with each build, filters it client-side (or via a lightweight edge/serverless function) to the CMO's selected date range, and renders the eight tabs.

```
[Meta Ads]  [Zoho CRM]  [GA4]  [GSC]      [LinkedIn XLS, manual upload]
     \           |          |     |                |
      \          |          |     |                v
       \_________|__________|_____|___>   [Claude Cowork sync job]
                                                |  writes JSON
                                                v
                                     /data/*.json  (Git repo)
                                                |  git push main
                                                v
                                     Vercel auto-deploy
                                                |
                                                v
                                     Web app (reads bundled/fetched JSON,
                                     filters client-side to selected range)
                                                |
                                                v
                                          CMO's browser
```

*(BRD refs: Section 1, Section 15.1)*

**2.2 Why no backend database**

Confirmed per BRD Section 3.2 — deliberately out of scope. Git-versioned JSON gives free history/rollback, zero hosting cost beyond Vercel, and fits the "scheduled batch write, many reads" access pattern (writes happen a few times a day from one process; reads happen from the CMO's browser only). Revisit only if per-channel file size or write-concurrency becomes a real constraint (see Section 8.3).

**3. Tech Stack (proposed)**

| Layer | Choice | Rationale |
|---|---|---|
| Frontend framework | Next.js (React), static export or ISR on Vercel | Matches existing Vercel deployment; supports both fully client-side filtering and optional edge functions if filtering logic needs to move server-side later |
| Styling | Existing CSS (carried over from static-preview.html) or Tailwind, preserving the current dark theme tokens | BRD Section 14 — visual system is frozen, not being redesigned |
| Charting | Recharts or Chart.js | Matches chart types already in the wireframe (bar, donut, area/line, grouped bar) |
| Date range picker | A maintained library (e.g., `react-day-picker` + custom presets) rather than hand-rolled | BRD Section 4.1 presets (Today, Last 7 days, Last 30 days, This Month, Last Month, This Quarter, Custom) map to standard preset patterns in most range-picker libraries |
| State/URL sync | URL query params as source of truth for range + comparison range (e.g., `?from=2026-06-01&to=2026-06-30&cf=2026-05-01&ct=2026-05-31`), read into React state on load | BRD Section 4.1 — "reflected in the URL... so a specific view can be bookmarked or shared" |
| Data layer | Plain `fetch`/`import` of static JSON at build or request time; no ORM/database client needed | No database in scope |
| Sync job runtime | Claude Cowork session (scheduled), not a traditional cron+server process | BRD Section 15.1 |
| Hosting | Vercel (existing) | BRD Section 15.4 |
| Repo | `technorucs-jp/technorucs-cmo-dashboard` (existing) | BRD Section 15.4 |

**4. Data Architecture**

**4.1 File layout**

```
/data
  meta-ads.json
  zoho-crm.json
  ga4.json
  gsc.json
  linkedin.json
  narratives.json        (optional — see Section 12.2)
  config/
    brand-terms.json      (SEO brand-term list, BRD 9.1)
    page-types.json        (GA4 page-type tagging, BRD 8.3)
    linkedin-competitors.json (BRD 11.2)
```

Each top-level channel file has a `meta` block (sync metadata) and a `records` array (day-granular data), never pre-aggregated. This is the single most load-bearing structural rule in the whole system — BRD Section 4.2's closing note is explicit that every derived ratio (CTR, cost/conversation, engagement rate) must be recomputed from raw numerators/denominators for whatever range is selected, which is only possible if the underlying rows are daily, not monthly.

**4.2 Common envelope (all channel files)**

```json
{
  "meta": {
    "channel": "meta-ads",
    "lastSyncedAt": "2026-08-10T09:03:11+05:30",
    "earliestRecordDate": "2026-05-01",
    "latestRecordDate": "2026-08-09",
    "syncSource": "Meta Marketing API",
    "coworkRunId": "run_2026-08-10T0900"
  },
  "records": [ /* channel-specific daily rows, see below */ ]
}
```

`earliestRecordDate` / `latestRecordDate` drive the "no data before [date]" and "data as of [date]" states required in BRD Section 4.1 and 4.2 — the frontend never needs to scan the full `records` array to know range coverage.

**4.3 `meta-ads.json` — record shape**

One row per ad set per day (BRD Section 6, 6.1, 6.2, 12):

```json
{
  "date": "2026-06-11",
  "adSetId": "1203...",
  "adSetName": "Construction Co. Australia",
  "campaignId": "1201...",
  "launchDate": "2026-06-11",
  "region": "AU",
  "spend": 9255.62,
  "impressions": 5368,
  "reach": 2970,
  "clicks": 105,
  "conversations": 22,
  "cpc": 88.15,
  "cpm": 1724,
  "frequency": 1.81,
  "opportunityScore": 100,
  "recommendations": []
}
```

Cost/conversation, CTR, and totals rows are **derived at render time** from summed spend/conversations/impressions over the filtered rows — never stored pre-computed, to avoid the range-mismatch bug that a stored ratio would introduce.

**4.4 `zoho-crm.json` — record shape**

One row per lead (BRD Section 7, 7.1–7.4):

```json
{
  "leadId": "4876...",
  "createdTime": "2026-06-03T11:42:00+05:30",
  "leadSource": "Meta Ads",
  "leadStatus": "Attempted to Contact",
  "owner": "Gopinath",
  "inquiryType": null,
  "notes": "How does the software work for multiple sites?"
}
```

`inquiryType` is nullable and intentionally unresolved pending BRD Section 7.4's open decision (Section 12.1 below) — the schema supports either a Zoho picklist value or a Cowork-classified bucket without a migration once that decision lands. `Partner`, `Referral`, and `ZoomInfo` sources are filtered out by the Cowork job before write, per BRD's exclusion rule — they should never appear in this file at all, not just be filtered client-side, to keep the JSON minimal and to make the exclusion auditable at the sync layer.

**4.5 `ga4.json` — record shape**

One row per day (BRD Section 8):

```json
{
  "date": "2026-06-15",
  "totalUsers": 214,
  "sessions": 267,
  "screenPageViews": 401,
  "engagedSessions": 174,
  "engagementRate": 0.652,
  "bounceRate": 0.348,
  "averageSessionDuration": 107,
  "channelGroup": "Organic Search",
  "country": "IN",
  "device": "desktop"
}
```

Sessions/users are naturally additive across days for a range; engagement rate, bounce rate, and avg. session duration are recomputed from summed engaged/total sessions and summed duration, not averaged day-value-by-day-value (averaging daily percentages would bias toward low-traffic days). Top-pages, top-sources, and country tables are separate arrays in the same file (`pages[]`, `sources[]`, `countries[]`, each carrying a `date` field) rather than nested inside the daily summary row, since they have their own per-day cardinality. Page-type tagging (Landing/Blog/Service/Conversion/Trust) is a lookup against `config/page-types.json` by URL path, not stored per record.

**4.6 `gsc.json` — record shape**

One row per query/page/country/device combination per day (BRD Section 9):

```json
{
  "date": "2026-06-20",
  "query": "dynamics 365 finance and operations",
  "page": "/solutions/microsoft-dynamics-365...",
  "country": "IN",
  "device": "desktop",
  "clicks": 0,
  "impressions": 562,
  "ctr": 0,
  "position": 28.2
}
```

Brand vs. non-brand classification is a lookup against `config/brand-terms.json` at render time, not stored per row, so the brand-term list can be edited without a re-sync. The `meta.latestRecordDate` field is what drives the required "data as of [date]" banner (BRD Section 9, note after 9.3) — this must be the actual latest date with data, not `lastSyncedAt`, since GSC's 2–3 day lag means those can differ by several days.

**4.7 `linkedin.json` — record shape**

Two record types in one file — daily trend rows and per-post rows — plus an explicit coverage block, since this file is upload-derived rather than continuously synced (BRD Section 11, 4.2):

```json
{
  "meta": {
    "channel": "linkedin",
    "lastSyncedAt": "2026-07-02T10:00:00+05:30",
    "uploads": [
      { "coversFrom": "2026-06-01", "coversTo": "2026-06-30", "uploadedAt": "2026-07-02T09:40:00+05:30", "fileType": "followers+visitors+content" }
    ]
  },
  "dailyTrend": [
    { "date": "2026-06-01", "newFollowers": 3, "impressions": 1385, "clicks": 129, "engagementRate": 0.452 }
  ],
  "posts": [
    { "postId": "urn:li:...", "date": "2026-06-01", "title": "Chennai Salesforce Trailblazer Community Meetup", "impressions": 3353, "clicks": 1385, "reactions": 129, "comments": 0, "engagementRate": 0.452, "ctr": 0.413, "videoViews": null }
  ],
  "audience": {
    "bySeniority": [ { "level": "Senior", "count": 1789 } ],
    "byJobFunction": [ { "function": "Engineering", "count": 1389 } ]
  },
  "competitors": [
    { "page": "BytesTechnolab — HR", "newFollowers": 15, "posts": 1, "comments": 0, "reactions": 15, "reactionsPerPost": 15.0 }
  ]
}
```

The `meta.uploads[]` array is what the app checks a selected range against for the "partial-data warning" / "fully covered" logic in BRD Section 4.2 — a range is only servable if it falls entirely within the union of `coversFrom`–`coversTo` intervals.

**4.8 `narratives.json` (conditional — see Section 12.2)**

Only needed if the CMO selects narrative option 2 or 3 in BRD Section 13. Keyed by channel and a range signature so the frontend can look up pre-written text without an LLM call at view time:

```json
{
  "meta-ads": {
    "2026-06-01_2026-06-30_vs_2026-05-01_2026-05-31": {
      "workingWell": ["..."],
      "notWorking": ["..."],
      "actions": { "immediate": ["..."], "process": ["..."], "strategic": ["..."] }
    }
  }
}
```

If the CMO instead picks option 1 (static rule-based templates, no LLM), this file is not needed — narrative strings are generated entirely in the frontend from computed flags, and Section 12.2 becomes moot.

**5. Sync Pipeline (Claude Cowork Job)**

*(BRD ref: Section 15.1)*

**5.1 Schedule**

| Channel | Cadence | Rationale |
|---|---|---|
| Meta Ads | Every 1–6 hours | Ad spend/delivery changes intraday; CMO may check mid-day |
| Zoho CRM | Every 1–6 hours | New leads arrive continuously |
| GA4 | Daily | GA4 data stabilizes same-day but daily is sufficient for this use case |
| GSC | Daily | Google's own 2–3 day lag makes more-frequent pulls pointless |
| LinkedIn | On manual upload only | No live API; event-driven, not scheduled |

**5.2 Per-run steps**

1. For each live channel (Meta Ads, Zoho CRM, GA4, GSC): call the channel's MCP connector for records since the day after `latestRecordDate` in the existing JSON (incremental pull), falling back to a fixed lookback window (e.g., last 3 days) to catch any late-arriving/corrected data, particularly for GSC.
2. Merge new/updated rows into the existing `records` array, keyed by a natural key per channel (date+adSetId for Meta, leadId for Zoho, date+dimensions for GA4/GSC), overwriting on key collision rather than appending duplicates.
3. Recompute `meta.earliestRecordDate` / `meta.latestRecordDate` from the merged array.
4. Set `meta.lastSyncedAt` to the run's completion time.
5. Validate the file (schema check — see Section 5.3) before writing.
6. Write all updated channel files, `git add`, commit with a message identifying the run and channels touched, `git push origin main`.
7. Vercel picks up the push automatically (existing behavior, no action needed from the job).

**5.3 Validation before commit**

The job must not push a file that fails basic shape validation (missing `meta` block, empty `records` where the previous run had data, a channel's `latestRecordDate` moving backward). On validation failure, the job should skip the write for that channel only, leave the previous good JSON in place, and flag it — this satisfies the "who to contact if a channel's data stops updating" runbook requirement in BRD Section 15.4, since a stale `lastSyncedAt` becomes the detectable symptom.

**5.4 LinkedIn conversion step**

Triggered by upload, not the schedule. Either the Cowork job or a small standalone script (BRD Section 11 gives either option) parses the CMO's XLS export(s) (Followers, Visitors, Content sheets), maps them into the `linkedin.json` shape in Section 4.7, appends a new entry to `meta.uploads[]` with the period the file covers, and pushes. The CMO-facing side of this is one runbook step (BRD Section 15.4), not a dashboard feature.

**6. Date Range Filtering — Client Logic**

*(BRD ref: Section 4)*

**6.1 Filter algorithm (per channel, per selected range)**

1. Read `meta.earliestRecordDate` / `meta.latestRecordDate` for the channel.
2. If the selected range's end date < `earliestRecordDate`, or the channel has no records at all: render the "no data before [date]" empty state (BRD 4.1) and skip steps 3–5.
3. If the range only partially overlaps available data, clip to the overlapping portion and still render, per channel-specific partial-data rules (LinkedIn requires *full* coverage per BRD 4.2 — that channel is the one exception where partial overlap is a hard warning state rather than a silent clip).
4. Filter `records` (or `dailyTrend`/`posts` for LinkedIn) to rows where `date` (or `createdTime`, converted to IST calendar date for Zoho per BRD 4.2) falls within `[start, end]` inclusive.
5. Recompute every derived metric (sums, then ratios from sums — never averaged ratios) from the filtered rows.
6. If a comparison range is set, repeat steps 1–5 for the comparison range and compute `% change = (current − comparison) / comparison`, flagging `≈ flat` for changes within ±2% (BRD 5.2) and mapping the result to a status tag per Appendix A of the BRD.

**6.2 Where filtering runs**

Given the data volumes implied by BRD 15.3 (≤24 months, day-granular, per channel — realistically tens of thousands of rows per channel file even at full history), client-side filtering in the browser is viable and keeps the "no live API round-trip" property intact. If a channel's file grows large enough that shipping the full JSON to the client becomes a page-weight problem, move filtering to a Vercel serverless/edge function that reads the same JSON from the deployed bundle (not from a live external API) and returns only the filtered/aggregated slice — this changes *where* the computation runs, not the *data source*, so it does not violate BRD 3.2's "no live API calls" rule. Decide this only if the 3-second performance target (BRD 15.3) is measured to be at risk; do not pre-optimize.

**7. Frontend Structure**

*(BRD ref: Section 14, wireframe cross-check)*

**7.1 Route / page inventory**

| Route | Tab | Primary data source(s) |
|---|---|---|
| `/` or `/overview` | Overview | All channels (aggregated cards + channel health table) |
| `/ad-campaigns` | Ad Campaigns | `meta-ads.json` |
| `/leads` | Leads | `zoho-crm.json` |
| `/website` | Website | `ga4.json` |
| `/seo` | SEO | `gsc.json` |
| `/email` | Email (placeholder) | none — static "not yet connected" state |
| `/linkedin` | LinkedIn | `linkedin.json` |
| `/total-leads` | Total Leads | `meta-ads.json` (current + comparison range) |

**7.2 Shared components**

- `TopBar`: logo/title, `DateRangePicker`, `ComparisonRangePicker` (BRD 4.1) — rendered once in the app shell, not per page, so state persists across tab navigation.
- `Sidebar`: fixed left nav, 8 items, active-tab highlight (BRD 14).
- `KpiCard`: primary value + supporting detail line(s), used across all tabs.
- `ChannelHealthTable`, `PeriodComparisonBlock`: Overview-specific but reusable pattern for any current-vs-comparison table.
- `StatusTag`: Leading / Good / Monitor / Action needed, colored per BRD Appendix A.
- `EmptyState` / `PartialDataWarning` / `NoDataBeforeDate`: shared components implementing BRD 4.1, 4.2, 14's empty/partial-state rules — used by every tab, not reimplemented per tab.
- `LastSyncedBadge`: reads `meta.lastSyncedAt` per channel, renders per BRD 14 and Section 12.1 below (open question on placement).
- `NarrativeBlock`: renders "What's working / not working" + Immediate/Process/Strategic actions, sourced either from computed flags (template option) or `narratives.json` (Cowork-generated option) — see Section 12.2.

**7.3 State management**

Selected range + comparison range live in the URL (`?from=&to=&cf=&ct=`) as the single source of truth, per BRD 4.1's bookmark/share requirement. On mount, parse the URL into state; on picker change, push a new URL (client-side navigation, no full reload) and re-run the filter (Section 6) for the active tab. Prefetch/filter other tabs in the background ("pre-warms the other tabs" per BRD 4.1) so switching tabs feels instant.

**8. Non-Functional Requirements — Technical Detail**

**8.1 Security**

*(BRD ref: 15.2)* No third-party API credentials exist anywhere in the web app's codebase, environment variables, or client bundle — all connector credentials live only inside the Claude Cowork environment, which is outside this repo. Add a CI check (e.g., a pre-commit or PR-check script scanning `/data` and application code for common credential patterns) as a backstop for the BRD 16 acceptance criterion "no API credentials appear anywhere... in the public Git repository." Authentication: minimum viable is a shared login (e.g., Vercel password protection or a simple auth middleware); revisit per-user accounts only if more than the CMO uses the dashboard.

**8.2 Performance**

*(BRD ref: 15.3)* Target: range-change results in <3 seconds for ranges up to 12 months. Given client-side JSON filtering, this should be sub-second in practice for the data volumes involved; treat the 3-second figure as a ceiling to alert on, not a target to design toward. Monitor actual filter/render time in production (e.g., a simple performance mark around the filter step) so a future data-volume increase that threatens this budget is caught before it becomes a support issue, not after.

**8.3 Data volume / file-splitting trigger**

*(BRD ref: 15.3)* Do not pre-split files by month at launch — start with one file per channel as specified in Section 4.1. Define a concrete trigger to revisit this (e.g., any single channel file exceeding ~5–10 MB, or measured filter time exceeding the 3-second budget) rather than leaving it as an open-ended "revisit later."

**8.4 Deployment**

*(BRD ref: 15.4)* No changes to the existing Vercel + GitHub setup. New CI step recommended: run the JSON schema validation from Section 5.3 on every PR that touches `/data`, not just inside the Cowork job, so a manually-edited or malformed JSON file can't reach `main` and break the deployed site.

**9. Traceability Matrix**

| BRD Section | TRD Section(s) |
|---|---|
| 4 — Date range filter | 6, 7.3 |
| 5 — Overview tab | 7.1, 7.2, 4.3–4.7 |
| 6 — Ad Campaigns tab | 4.3, 7.1 |
| 7 — Leads tab | 4.4, 7.1 |
| 8 — Website tab | 4.5, 7.1 |
| 9 — SEO tab | 4.6, 7.1 |
| 10 — Email placeholder | 7.1, 7.2 (`EmptyState`) |
| 11 — LinkedIn tab | 4.7, 5.4, 7.1 |
| 12 — Total Leads tab | 4.3, 7.1 |
| 13 — Narrative insights | 4.8, 7.2, 12.2 |
| 14 — UI/UX | 7.2, 7.3 |
| 15.1 — Sync pipeline | 5 |
| 15.2 — Security | 8.1 |
| 15.3 — Performance | 8.2, 8.3 |
| 15.4 — Deployment | 8.4, 5.4 |
| 16 — Acceptance criteria | 6.1, 4 (all schemas), 8.1 |

**10. Testing Approach**

- **Schema tests**: validate every `/data/*.json` file against a JSON Schema per channel (derived directly from Section 4.3–4.8) on every Cowork run and every PR touching `/data`.
- **Filter logic unit tests**: fixed sample JSON fixtures with known daily values, asserting that filtering to a known range produces hand-calculated totals/ratios — this is the highest-value test suite, since a filtering bug silently produces wrong numbers rather than an error.
- **Reconciliation test**: for a range matching a full past calendar month (e.g., June 2026), assert computed KPIs match the previously-published static dashboard for that month within BRD 16's ±1% tolerance — run this once per historical month as a regression check, not just at launch.
- **Empty/partial-state tests**: fixtures with a range before `earliestRecordDate`, a range partially overlapping LinkedIn upload coverage, and a channel with zero matching records, asserting the correct empty/partial/zero-state component renders (not a bare "0").
- **Staleness test**: fixture with an old `lastSyncedAt`, asserting the `LastSyncedBadge` reflects staleness (exact UI behavior TBD — see Section 12.1).

**11. Assumptions**

- The existing `technorucs-jp/technorucs-cmo-dashboard` repository and Vercel project are reused as-is; no new hosting account needed.
- The Cowork job runs as a scheduled Claude Cowork session with write access to the repo (existing pattern for other scheduled Cowork tasks), not a separately-hosted cron service.
- No multi-tenant requirement — this is a single-company, single-CMO-primary-user dashboard; per-user accounts (BRD 15.2) are explicitly a "revisit if needed," not a v1 requirement.

**12. Open Technical Decisions**

These map directly to the judgment calls flagged (and intentionally left unresolved) in BRD v2.1 — they block final implementation of the sections noted and should be resolved with the CMO before those specific pieces are built. Everything else in this TRD can proceed independently.

**12.1 Lead intent classification (blocks Section 4.4's `inquiryType` field and BRD Section 7.4)**

Two implementation paths, same as the BRD frames it:
- *Zoho picklist*: add `Inquiry_Type` as a required field in Zoho CRM, captured by the sales rep at first contact. Cowork job simply reads the field — no new logic in the sync job. Lowest engineering cost, but depends on the sales team reliably filling it in.
- *Cowork classification*: sync job runs each lead's `notes` text through keyword matching or an LLM call against the fixed bucket list, writing the result into `inquiryType` at sync time. Higher engineering/run cost (an LLM call per new lead, each run), no dependency on sales-team data entry discipline.

Recommendation for discussion: start with the Zoho picklist approach given it's lower-cost and the BRD itself calls it "recommended, most reliable" — but this is the CMO's call, not a default I'm implementing without confirmation.

**12.2 Narrative generation approach (blocks Section 4.8 / `narratives.json`, and the `NarrativeBlock` component's data source)**

Per BRD Section 13's three options. This determines whether `narratives.json` exists at all:
- *Option 1 (static templates)*: no `narratives.json`; `NarrativeBlock` renders entirely from computed flags/thresholds in the frontend. Zero ongoing cost, least flexible wording.
- *Option 2 (Cowork-generated)*: `narratives.json` written by the Cowork job each run; `NarrativeBlock` just renders stored text. Most natural-sounding output, but text only updates on the next scheduled sync.
- *Option 3 (hybrid)*: flags computed in the frontend as in Option 1, but Cowork writes only the phrasing around pre-computed flags into `narratives.json`. Middle ground on cost and flexibility.

**12.3 "Last synced" indicator placement and staleness behavior**

BRD Section 14 requires a per-channel "last synced" indicator but doesn't specify where in the UI it appears or what happens when a channel goes stale (e.g., does the dashboard show a warning banner, or just the raw timestamp?). Recommend: a small badge next to each channel's data on every tab that uses it (not just Overview), turning visually distinct (e.g., amber) if `lastSyncedAt` is older than 2× the channel's expected sync interval from Section 5.1 — but the exact visual treatment should be confirmed with the CMO rather than assumed, since it's a design decision as much as a technical one.

**12.4 Date-range-picker rollout**

The current static-preview.html wireframe still shows the old May/June/Compare-MoM toggle rather than the calendar range picker specified in BRD Section 4. Confirm whether the wireframe needs to be updated to reflect the new picker before development starts, or whether development should proceed directly from this TRD's Section 6–7 spec without an interim wireframe revision.
