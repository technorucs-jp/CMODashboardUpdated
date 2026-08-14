**TechnoRUCS**

**CMO Dashboard — Real-Time Platform**

Business & Functional Requirements Document

Version 2.3 | August 14, 2026 (v2.1 baseline August 10, 2026)

Prepared for: Development Team

Prepared by: Jayaprakash S, CMO & Founder, TechnoRUCS

*Reference build: technorucs_cmo_dashboard_july2026_v2.html (static-preview.html, Vercel)*

> **Change note (v2.0):** This revision removes all live API integration from the web application itself. Data ingestion is now performed by scheduled Claude Cowork sessions that write channel data to JSON files in a `/data` folder and push to the `main` branch, which Vercel auto-deploys. See Section 4 and Section 15.1 for the full replacement design. All other requirements (date range filtering, tabs, thresholds, UI) are unchanged from v1.0 unless noted.

> **Change note (v2.1):** Corrects two internal inconsistencies surfaced by a cross-check against the current static-preview.html wireframe: (1) Section 3.1's tab count/list did not match the tab lists in Section 10 and Section 14 — corrected below. (2) Section 7.1 now explicitly states that all lead-status metrics, including ones at zero, must render as cards rather than being omitted — the current wireframe drops "Contact in Future" and "Junk" cards when their count is zero, which conflicts with the empty-state principle already stated in Section 14. No other requirements changed; open judgment calls identified during the wireframe cross-check (lead intent bucket classification method, narrative-generation approach, date-range-picker build status) are intentionally left as-is pending a decision from the CMO and are not addressed in this revision.
>
> **Change note (v2.3, 2026-08-14) — access model: the dashboard no longer asks anyone to sign in.** The CMO directed that the Microsoft sign-in screen be removed and replaced with a **role popup shown at app launch**: the viewer picks a role and enters the dashboard. There is exactly **one role, CMO**, and it sees every tab and every figure — no per-role filtering exists or is planned. Full detail in TAD v1.2 §0A (ADR-015).
>
> One business requirement in this document is directly contradicted by that change, and is flagged rather than quietly rewritten: **§15.2's "dashboard access restricted to authenticated internal users."** The application no longer authenticates anyone, so anybody with the URL can open the dashboard, and anybody with a `/data/*.json` URL can fetch that file. The role popup is a label, not a gate. §15.2 has been annotated below with the current status and the recommended way to satisfy it (host-level deployment password protection, e.g. Vercel Deployment Protection, which needs no application backend); **it needs a decision from the CMO before production release** and is tracked at TAD §16.5 and CHECKLIST item 5.24. Everything protecting lead data now rests on the rule that lead free-text is never written into the published files at all (v2.2 note below; TAD ADR-012) — that rule is unchanged and now carries the entire load. No other requirement in this document changed: all eight tabs, every metric, the date-range filter, and the acceptance criteria in §16 are unaffected except §16's access-related bullet, likewise annotated.

> **Change note (v2.2 pointer, same day):** After this BRD and the TRD/TAD were drafted, the CMO directed a build-time architecture change — a Vite + React single-page app with **no application backend**, instead of the Next.js server-rendered design the TAD's v1.0 baseline had specified. None of the business requirements below changed. Two things worth the CMO's attention because they touch requirements stated in this document: (1) **Section 15.2's access-control requirement** is now met by a client-only Microsoft Entra ID login (no server session) rather than a server-checked one — a party with a direct URL to a `/data/*.json` file can fetch it without passing the login screen, since no server is left to gate it; mitigated by never writing lead notes into that file at all (was previously mitigated by server-side redaction). (2) Section 3.1's `/data` folder now lives under the app's public asset path by design, not outside it. Full detail: TAD v1.1 §0 (ADR-011–014) and the open item at TAD §16.4, flagged for sign-off before Phase 5 production release.

**1. Purpose & Background**

TechnoRUCS has produced three monthly editions of the CMO Dashboard (May, June, and July 2026) as a static HTML file. Each edition is generated manually: the CMO opens a Claude session, Claude pulls data live via MCP connectors (Meta Ads, Zoho CRM, GA4, GSC) for the requested date range, the CMO uploads LinkedIn XLS exports, and Claude compiles a single static-preview.html file that is Git-pushed and auto-deployed on Vercel.

This model has validated exactly which metrics matter for marketing-to-revenue visibility across six channels: Meta Ads, Zoho CRM (inbound leads), GA4 (website), Google Search Console (organic search), LinkedIn (organic social), and cross-channel lead attribution. It does not, however, support real-time viewing or arbitrary date ranges — every edition is a fixed calendar-month snapshot rebuilt by hand.

This document specifies the requirements for a database-free, JSON-backed version of the same dashboard, with two structural changes from the current model:

1. A global custom date range filter that lets the CMO select any start and end date and see every metric on every tab recalculated for that exact window, without a manual rebuild.
2. Data ingestion moves from "CMO opens a Claude session and manually assembles one HTML file" to "a scheduled Claude Cowork session pulls each channel's data via MCP connectors, writes it to a JSON file per channel in a `/data` folder, and pushes to Git." The web application itself makes **no live API calls** to Meta, Zoho, GA4, or GSC — it only ever reads the JSON files that ship with the deployed code.

**2. Objectives**

- Reproduce every metric, table, and chart currently in the static dashboard (Overview, Ad Campaigns, Leads, Website, SEO, LinkedIn, Total Leads) in a queryable web application driven by JSON data files.
- Replace the fixed May / June / July month toggle with a global custom date range picker (start date + end date, plus a comparison range) that drives every tab.
- Replace the manual "CMO opens a Claude session once a month" workflow with a **scheduled Claude Cowork job** that pulls Meta Ads, Zoho CRM, GA4, and GSC data via MCP connectors, writes each channel's data to its own JSON file under `/data`, and pushes the update to the `main` branch. Vercel auto-deploys on every push, so the dashboard always reflects the data as of the last Cowork run.
- Retain LinkedIn as a manual-upload-derived source (see Section 6.6 and Section 9) since LinkedIn does not expose a usable analytics API for this account — the CMO's uploaded XLS is converted into the same `/data` JSON format as the other channels (by Cowork or a conversion script) rather than read live.
- Preserve the existing visual design system — dark theme, fixed left sidebar, card/table/bar-row components — so the new build is a drop-in replacement for static-preview.html.

**3. Scope**

**3.1 In Scope**

- Web application (desktop-first, responsive) replacing static-preview.html at the same or a new URL.
- A `/data` folder in the repository holding one JSON file per channel (e.g., `meta-ads.json`, `zoho-crm.json`, `ga4.json`, `gsc.json`, `linkedin.json`), containing day-granular records so any arbitrary date range can be recomputed client-side or at build/request time — never pre-aggregated to monthly totals only.
- A scheduled Claude Cowork job (see Section 15.1) that refreshes each JSON file via its channel's MCP connector and pushes the update to `main`. The web application does not call Meta, Zoho, GA4, or GSC directly at any point.
- Global custom date range filter with an optional comparison period, applied consistently across all tabs, computed by filtering the JSON records already present in the repository.
- Manual LinkedIn data import (XLS upload) converted into the same `/data/linkedin.json` format so LinkedIn metrics respond to the date filter like every other channel.
- All eight tabs from the current build: Overview, Ad Campaigns (Meta), Leads (Zoho), Website (GA4), SEO (GSC), Email (Instantly.ai — placeholder, see Section 10), LinkedIn, Total Leads.
- A "last synced [timestamp]" indicator per channel, read from metadata stored in each JSON file (e.g., a `lastSyncedAt` field written by the Cowork job).

**3.2 Out of Scope (this phase)**

- Any live API calls from the web application to Meta Ads, Zoho CRM, GA4, GSC, or LinkedIn — all data ingestion happens via the Claude Cowork → JSON → Git → Vercel pipeline, not via in-app API integration.
- A backend database (e.g., Postgres) — data lives in versioned JSON files in the Git repository, not a managed database instance.
- Email tab (Instantly.ai) — integration is pending on the Instantly side; keep the tab as a placeholder as in the current build.
- Automated write-back to Meta Ads, Zoho CRM, or LinkedIn (e.g., pausing campaigns, updating lead status) — this remains a read-only reporting layer.
- Ubersuggest backlink data — connector is currently unreliable; treat as a future enhancement, not a blocker.
- Mobile native app — responsive web only.
- An in-app "Sync now" button that triggers a live pull (see Section 15.1 for how manual refresh works instead).

**4. Global Requirement — Custom Date Range Filter**

This remains the single most important behavioural change from the current static build. It replaces the fixed May 2026 / June 2026 / Compare MoM toggle.

**4.1 Functional behaviour**

- A persistent date range control in the top bar, visible on every tab, with a calendar picker for Start Date and End Date.
- Default on load: current calendar month to date.
- Quick-select presets: Today, Last 7 days, Last 30 days, This Month, Last Month, This Quarter, Custom.
- A secondary "Compare to" control (off by default) that lets the CMO pick a second range — e.g., previous period, previous month, previous year, or another custom range — to reproduce the current Compare MoM cards (Section 5.5, 8.7) for any two arbitrary periods, not just adjacent calendar months.
- Selecting a range re-filters the day-granular JSON records for the active tab (and pre-warms the other tabs) without a full page reload. Because the underlying data is static JSON shipped with the deployed build, this filtering can happen entirely client-side or in a lightweight serverless function — no external API round-trip is involved at request time.
- The selected range and comparison range are reflected in the URL (query parameters) so a specific view can be bookmarked or shared.
- Ranges may cross month boundaries and may be as short as one day or as long as the full data history present in the JSON files.
- A range (or part of a range) that predates the earliest data present in a channel's JSON file must show an explicit "no data before [date]" state for that channel, not a zero.

**4.2 Data alignment rules**

- Meta Ads: the Cowork job pulls using the ad platform's own date range parameter (time_range with since/until) per sync, storing daily rows in `meta-ads.json` so spend, impressions, and conversions stay exactly consistent with Meta's own reporting when the app re-aggregates for an arbitrary range.
- Zoho CRM: the Cowork job pulls leads with Created_Time between each day's 00:00:00 and 23:59:59 in IST (+05:30), storing one record per lead (with its Created_Time and Lead_Source/Lead_Status) in `zoho-crm.json`, matching current logic.
- GA4: the Cowork job pulls daily rows keyed by date into `ga4.json`, matching current logic.
- GSC: the Cowork job pulls daily search analytics rows into `gsc.json`; note GSC data has a 2–3 day reporting lag from Google's side, so the most recent 2–3 days of any selected range may be missing or incomplete in the JSON — surface this as a small "data current as of [date]" note on the SEO tab, derived from the `lastSyncedAt` / latest-row-date metadata, rather than silently under-reporting.
- LinkedIn: since data is manually uploaded per period, the app (or the conversion step that produces `linkedin.json`) must tag each uploaded XLS with the date range it covers, and only surface LinkedIn metrics for a selected range if uploaded data fully covers it. If the selected range only partially overlaps available LinkedIn data, show a partial-data warning rather than a silently incomplete number.

> *Note: Cost-per-conversion, CTR, engagement rate, and every other derived ratio must be recalculated from the filtered numerators/denominators for the selected range — never interpolated or pro-rated from monthly totals. This requires the JSON files to hold day-level granularity, not monthly aggregates.*

**5. Functional Requirements — Overview Tab**

The Overview tab is the executive summary. All values below must recalculate for the selected date range from the JSON data in `/data`.

**5.1 KPI cards**

| **Card** | **Primary value** | **Supporting detail shown** |
|---|---|---|
| Ad Spend | Total Meta Ads spend (₹) for range | Conversation count · Cost per conversation |
| Total Leads | Meta Ads conversation count for range | Cost per lead (₹) |
| Sessions | GA4 total sessions for range | Engagement rate % · Countries reached |
| Organic Clicks | GSC total clicks for range | Total impressions · Average CTR % |
| New Followers | LinkedIn new followers for range | Total impressions · Total reactions |
| Meta Conversations | Meta Ads conversation count for range | Active campaign count · Average cost/lead (₹) |

**5.2 Channel health table**

One row per channel, recalculated for the selected range and compared against the comparison range (Section 4.1):

| **Column** | **Definition** |
|---|---|
| Channel / Source | Meta Ads, GA4, GSC, LinkedIn Page — fixed list |
| Key metric | The channel's headline metric (cost/conversation, engagement rate, non-brand clicks, reactions/post) |
| Value | Current-period value for that metric |
| vs. comparison period | % change vs. the comparison range, or "≈ flat" within a ±2% band |
| Status | Rule-based tag: Leading / Good / Monitor / Action needed, per thresholds in Appendix A |

**5.3 Period comparison summary**

Three grouped comparison blocks, each showing current vs. comparison-period values and % change:

- Meta Ads: Spend, Conversations, Cost/conversation, Impressions, CPM
- Leads + Website: Meta conversations, Contact rate, Sessions, Engagement rate, Avg. session duration
- LinkedIn + SEO: New followers, Reactions, GSC clicks, Non-brand clicks, GSC impressions

**6. Functional Requirements — Ad Campaigns (Meta) Tab**

Source: `/data/meta-ads.json`, populated by the Claude Cowork job from the Meta Marketing API, account ID 1572040794243205, level=campaign / adset as needed. The web app filters the stored daily records to the selected date range; it never calls the Meta API directly.

**6.1 Account overview cards**

| **Metric** | **Meta API field (as captured into JSON by Cowork)** |
|---|---|
| Total spend (₹) | spend |
| Impressions | impressions |
| Reach | reach |
| Clicks (all) | clicks |
| Conversations (messaging replies) | actions / onsite_conversion.messaging_conversation_started_7d (or the configured conversion action) |
| Avg. CPC (₹) | cpc |
| CPM (₹) | cpm |
| Frequency | frequency |
| Cost per conversation (₹) | spend ÷ conversations, computed by the app for the selected range |

**6.2 Ad set / campaign breakdown table**

One row per ad set active in the selected range, sortable by spend or cost/conversation: Ad set name, launch date, region/geo targeting, Spend, Impressions, Clicks, CTR, CPC, CPM, Reach, Conversations, Cost/conversation. Include a totals row.

**6.3 Geography breakdown**

- Spend-by-country chart (donut or bar)
- Region performance detail table: Country, Spend, Impressions, Clicks, Reach, CTR, % of total budget

**6.4 Charts**

- Conversations started by ad set (bar)
- Cost-per-conversation by ad set (bar, ideally with an account-average reference line)

**6.5 Account opportunity score & suggestions**

The Cowork job should also capture Meta's own Ad Account Opportunity Score (0–100) and Meta's native recommendations into `meta-ads.json` at sync time. Where an ad set's cost/conversation exceeds the account average by a defined multiple, or an ad set has spend with zero conversions, or overlapping ad sets are targeting the same audience, the app generates a rule-based flag (see Appendix A for thresholds) from the stored data. Full natural-language write-ups like the current "Consolidate the four simultaneous BC Australia campaigns" narrative are AI-generated commentary — see Section 13 for how to reproduce this without a manual Claude session.

**7. Functional Requirements — Leads (Zoho CRM) Tab**

Source: `/data/zoho-crm.json`, populated by the Cowork job from the Zoho CRM Leads module, filtered to Lead_Source in (Meta Ads, SEO, Social Media, Email Campaign) — Partner, Referral, and ZoomInfo sources are always excluded, per current scope rules. The stored records carry each lead's Created_Time so the app can filter to the selected range.

**7.1 Inbound leads overview cards**

| **Metric** | **Calculation** |
|---|---|
| Total inbound leads | Count of leads with Created_Time in range and Lead_Source in the inbound set |
| Leads by source | Count grouped by Lead_Source (Meta Ads / SEO / Social Media / Email Campaign), with % of total |
| Contacted | Count where Lead_Status = Contacted; contact rate = Contacted ÷ Total |
| Attempted to Contact | Count where Lead_Status = Attempted to Contact |
| Lost / Not interested | Count where Lead_Status = Lost / Not interested |
| Contact in Future | Count where Lead_Status = Contact in Future |
| Junk | Count where Lead_Status = Junk |
| Meetings scheduled | Count where Lead_Status = Meeting Scheduled (or equivalent stage) |
| Active days | Distinct calendar days within range with ≥1 lead created |

> *Note (added v2.1): Every card in the table above — including Contact in Future and Junk — must always render for the selected range, even when its count is 0. The current static wireframe omits these two cards entirely for periods where their count is zero; per the empty/partial-state principle already stated in Section 14, a status with a zero count for the period is still a data point (it distinguishes "no leads reached this stage" from "we don't track this stage") and must not be silently dropped from the layout.*

**7.2 Status distribution & daily volume**

- Lead status donut per primary source (currently shown for Meta Ads)
- All-inbound status distribution bar/list
- Daily inbound volume stacked bar chart by source, for every day in the selected range

**7.3 Sales rep performance table**

Grouped by the Owner field: Rep name, Assigned count, Contacted count, Attempted count, Lost count, Meeting count, Contact rate %. Must include every active rep even if their assigned count is zero for the selected range (to surface distribution imbalance, as in the current "88% of leads on one rep" finding).

**7.4 Lead intent bucket analysis**

The current build classifies each Meta Ads lead's notes field (e.g., "How does the software work for multiple sites?") into intent buckets — multi-site construction, demo request, generic/low intent, Business Central ERP setup, production visibility, general info — with per-bucket status breakdowns. This classification does not exist as a Zoho field today; it was generated by reading raw lead notes in a Claude session. To reproduce this automatically, choose one:

- Add a required picklist field in Zoho CRM (e.g., Inquiry_Type) captured at lead-form submission or by the first-contact rep, and group by that field — recommended, most reliable — or
- Have the Claude Cowork sync job classify each lead's notes text (rule-based keyword matching, or an LLM call against a fixed bucket list) at sync time and write the resulting bucket into the lead's record in `zoho-crm.json` — higher engineering/run cost, needed only if the sales team will not reliably tag Inquiry_Type at the point of contact.

> *Note: Flag this as a decision item for the developer and CMO to resolve before build — it changes both the Zoho CRM configuration and the Cowork sync job's logic.*

**8. Functional Requirements — Website (GA4) Tab**

Source: `/data/ga4.json`, populated by the Cowork job from the Google Analytics 4 Data API for the technorucs.com property, with daily rows so the app can filter to any selected range.

**8.1 Overview cards**

| **Metric** | **GA4 dimension/metric** |
|---|---|
| Total users | totalUsers |
| Sessions | sessions |
| Page views | screenPageViews |
| Engaged sessions / engagement rate | engagedSessions / engagementRate |
| Avg. bounce rate | bounceRate |
| Avg. session duration | averageSessionDuration |
| Pages / session | screenPageViews ÷ sessions |
| Countries reached | count distinct country |

**8.2 Traffic breakdown**

- Daily sessions trend chart across the full selected range
- Channel breakdown (sessionDefaultChannelGroup): sessions and % share per channel
- Top sources detail table: Source, Sessions, Engaged sessions, Bounce rate, Channel
- AI-referral tracking: sessions from chatgpt.com, copilot.microsoft.com, perplexity.ai, and similar sources, with engagement rate and bounce rate vs. site average

**8.3 Pages, geography, devices**

- Top pages by views table: Page, Views, Users, Engaged sessions, Bounce rate, Avg. duration, Page type (tag pages by type — Landing / Blog / Service / Conversion / Trust — in a config file, since GA4 does not know this)
- Country engagement table: Country, Users, Bounce rate, Avg. duration
- Device split: Desktop vs. Mobile sessions and engagement rate per device

**8.4 User journey**

Path/funnel visualization (e.g., Home → Contact Us, About Us → Global Clients), captured by the Cowork job from GA4's path exploration data or a custom event-sequence query and stored alongside the daily rows. Treat as a distinct, lower-priority chart if the GA4 API's pathing data proves difficult to query on a sync schedule — a static top-N paths table is an acceptable fallback.

> *Note: UTM parameters are not currently set on Meta Ads URLs, so GA4 shows zero paid-session attribution even though Meta campaigns are active. Fixing this (utm_source=meta&utm_medium=paid_social&utm_campaign=...) is a prerequisite for this dashboard to ever show a Paid Social row with real numbers — flag to the ads team, not just the developer.*

**9. Functional Requirements — SEO (Google Search Console) Tab**

Source: `/data/gsc.json`, populated by the Cowork job from the Search Console API, siteUrl = https://www.technorucs.com/ (trailing slash required — the sc-domain: property format does not return data for this account).

**9.1 Overview cards**

| **Metric** | **GSC field** |
|---|---|
| Total clicks | clicks |
| Total impressions | impressions |
| Avg. CTR | ctr |
| Avg. position | position |
| Indexed pages | count of distinct ranking pages |
| Brand click share | clicks on brand-term queries ÷ total clicks — brand terms defined in a config list ("technorucs", "technorucs private limited", common misspellings) |
| Countries reached | count distinct country dimension |
| Mobile click share | clicks where device = MOBILE ÷ total clicks |

**9.2 Query & opportunity tables**

- Click-generating queries table: Query, Clicks, Impressions, CTR, Position, Type (Brand/Non-brand, from the same config list)
- High-impression, zero-click keywords table: Query, Impressions, Clicks=0, Position, Priority (rule-based: Critical if impressions > 100 and position > 50; High if impressions > 50 and position > 30 — tune thresholds with the CMO)
- Top pages by clicks and impressions
- Clicks/impressions by country
- Device performance table: Device, Clicks, Impressions, CTR, Avg. position

**9.3 Backlinks**

Ubersuggest MCP is connected but has been unreliable in-session. If the developer can get a stable Ubersuggest or equivalent (Ahrefs/SEMrush) API key, the Cowork job can add referring domains, domain authority, and competitor keyword gap vs. named Microsoft-partner competitors into `gsc.json` (or a dedicated `backlinks.json`). Otherwise keep this as a placeholder panel, as in the current build.

> *Note: GSC data typically lags 2–3 days behind real time; the UI must show a "data as of [date]" indicator, derived from the latest date present in `gsc.json`, rather than implying same-day completeness.*

**10. Email (Instantly.ai) Tab — Placeholder**

Keep as a placeholder tab exactly as in the current build: "Email data not yet connected." When Instantly.ai integration is approved, this tab will need: open rate, reply rate, meetings booked, sequence-level performance, and A/B test results, filtered by the same global date range — sourced from a future `/data/instantly.json` populated the same way as the other channels.

**11. Functional Requirements — LinkedIn Tab**

LinkedIn does not expose a usable analytics API for this Page (persistent permission limitations, confirmed across multiple integration attempts). This tab remains upload-driven: the CMO uploads XLS exports (Followers, Visitors, Content), and these are converted into `/data/linkedin.json` in the same format the app expects from every other channel, either by the Cowork job or a small conversion script run alongside it.

**11.1 Overview cards**

- New followers, Total page views, Unique visitors, Total impressions, Total clicks, Total reactions, Comments, Posts published — all for the selected range, sourced from `linkedin.json`

**11.2 Trends & breakdowns**

- Competitor comparison table (Page, New followers, Posts, Comments, Reactions, Reactions/post, Verdict) — competitor page name(s) configurable
- Daily new-followers trend, daily impressions/clicks trend, engagement-rate-by-day trend — all clipped to the selected range
- Post performance table: every post published within range, ranked by impressions, with Impressions, Clicks, Reactions, Comments, Engagement %, CTR %, and (for video posts) Video views
- Audience profile: Followers by seniority, Followers by job function, Visitor industry and company size — sourced from the LinkedIn XLS demographic breakdown sheets

**12. Functional Requirements — Total Leads (Cross-Period Meta Comparison) Tab**

This tab is a focused Meta Ads comparison between the primary selected range and the comparison range (Section 4.1), replacing the current fixed "May vs June" view, computed from `meta-ads.json`.

- Headline comparison cards: Conversations (current vs. comparison, % change), Cost/conversation (current vs. comparison, % change), Spend and campaign count for both periods
- Full campaign breakdown table for each period: Campaign, Impressions, Reach, Conversations, Spend, Cost/conversation — with a totals row
- Conversations-comparison chart (grouped bar, one group per campaign, one bar per period)

**13. Cross-Cutting Requirement — Narrative Insights**

Every tab in the current build ends with a "What's working / what's not" narrative and a three-tier action list (Immediate / Process / Strategic). These are written analysis, not raw metrics, and were produced by Claude reading the pulled data each month. Three implementation options, in increasing order of engineering effort:

1. Static, rule-based templates: pre-write sentence templates with placeholders (e.g., "{channel} cost/conversion moved {direction} {pct}% vs. the comparison period, driven by {top_driver_campaign}") and fill them from the computed metrics at request time. Cheapest, least flexible, no ongoing API cost.
2. Cowork-generated summary: as part of the scheduled sync job, after writing the JSON files, have Claude Cowork also generate the narrative text for the just-synced period and store it as a `narrative` field in each channel's JSON (or a shared `narratives.json`), so the app simply renders pre-written text rather than calling an LLM per page view.
3. Hybrid: rule-based flags feed a shorter Cowork-generated pass that only writes the narrative sentences around already-computed flags/thresholds (e.g., "BC Australia at ₹1,380/conv, 7.8× the period average" is computed, Cowork only phrases the recommendation), stored the same way as option 2.

> *Note: Decide this with the CMO before development starts. Because there is no live LLM call from the app itself, options 2 and 3 both mean the narrative text only updates when the Cowork job next runs — the app never generates narrative on demand.*

**14. UI / UX & Design Requirements**

- **Role popup at launch (added v2.3).** Opening the dashboard shows a single modal dialog naming the available roles — currently just **CMO** — with the role pre-selected and a Continue action. Choosing it enters the dashboard. The dialog carries no metric values, no sign-in, and no password. It appears once per browser session: an accidental refresh does not re-ask, but opening the dashboard fresh (a new tab, or after closing the browser) does, since it is a launch prompt. The chosen role does not change what is shown — every role sees all eight tabs and every figure.
- Retain the dark theme (#0d1117 base background) and existing color system for status tags (Leading / Good / Monitor / Action needed).
- Retain the fixed left sidebar for channel navigation: Overview, Ad Campaigns, Leads, Website, SEO, Email, LinkedIn, Total Leads.
- Retain the existing card, table, and horizontal bar-row components — this is a data-refresh and filtering upgrade, not a visual redesign.
- Date range picker and comparison-period picker sit in the top bar, always visible, independent of which sidebar tab is active.
- Every chart/table that currently spans two hard-coded months (May and June side by side) becomes: current range vs. comparison range, both driven by the picker.
- Loading states: show a lightweight skeleton/spinner per card while a range change is being filtered/recomputed (this should be near-instant since it reads local JSON, not a live API).
- "Last synced [timestamp]" indicator per data source, read from each JSON file's sync metadata, since Meta Ads, Zoho, GA4, and GSC are refreshed by the scheduled Cowork job rather than pulled live per click.
- Empty/partial states: if a selected range has no data for a channel (e.g., before LinkedIn uploads began, before the JSON history starts, or a date range with zero Zoho leads), show an explicit empty state, not a zero that could be misread as "nothing happened."

**15. Non-Functional Requirements**

**15.1 Data refresh & the Cowork → JSON → Git → Vercel pipeline**

This section replaces the live-API sync-job design from v1.0 of this document.

- A Claude Cowork session, run on a defined schedule (recommended: every 1–6 hours for Meta Ads/Zoho, daily for GA4/GSC given their own reporting lag), connects to each channel's MCP connector (Meta Ads, Zoho CRM, GA4, GSC), pulls the latest data, and appends/updates the day-granular records in the corresponding `/data/*.json` file — never pre-aggregating away the daily granularity the date filter needs.
- After updating the JSON files, the Cowork session commits and pushes the change to the `main` branch of the existing repository (technorucs-jp/technorucs-cmo-dashboard).
- Vercel's existing auto-deploy pipeline picks up the push and republishes the site, so the dashboard reflects the data as of the last Cowork run once the deploy completes.
- There is no in-app "Sync now" button in this design, since the app has no API credentials or connectors of its own. A manual refresh means triggering the Cowork job to run outside its schedule (see the runbook requirement in Section 15.4) rather than an in-app action.
- The web application's only data dependency at runtime is the JSON files bundled with (or fetched from) the deployed build — it performs no outbound calls to Meta, Zoho, GA4, or GSC.

**15.2 Security & credentials**

- Because the web application makes no direct calls to Meta, Zoho, GA4, or GSC, it holds no API credentials for those services at all — those credentials/connectors live only in the Claude Cowork environment that runs the scheduled sync job.
- The `/data` JSON files themselves must not contain any secrets, tokens, or credentials — only the metric data pulled from each platform.
- Dashboard access restricted to authenticated internal users (at minimum, a shared login; ideally per-user accounts if more than the CMO will use it).

> **Status of the requirement above (v2.3, 2026-08-14): NOT MET — open, needs a CMO decision before production release.**
>
> This requirement is left in place deliberately. It was met by Microsoft Entra sign-in until the CMO directed that the sign-in screen be replaced by a role popup at launch (TAD ADR-015). The popup asks *who* the viewer is; it does not check *whether* they may be there. As things stand:
>
> - Anyone with the dashboard URL can open it and see every tab.
> - Anyone with a `/data/*.json` URL can fetch that file directly (this part predates v2.3 — there is no server to gate it, see the v2.2 note).
> - The only remaining protection for lead data is that lead free-text (`notes`) is never written into the published files in the first place, so the worst case is marketing and CRM *aggregates*, never customer wording.
>
> **Recommended way to close it:** turn on the hosting platform's own deployment password protection (e.g. Vercel Deployment Protection) in front of the whole site, asset files included. That is a settings change on the host — no developer work, no backend, no new login for anyone to manage — and it satisfies this requirement's "at minimum, a shared login" as written.
>
> **The alternative is to amend this requirement**, recording public access as an accepted risk. Either answer is workable; what is not workable is shipping to production without choosing one. Tracked at TAD §16.5 and CHECKLIST item 5.24.

**15.3 Performance**

- Any date-range change should return updated results in under 3 seconds, for ranges up to 12 months, since filtering runs against local JSON data already present in the deployed build rather than a live external API call.
- The application must handle at least 24 months of historical data (May 2026 onward) in the `/data` JSON files without a redesign of the file structure; if per-channel JSON file size becomes a concern at that scale, consider splitting each channel's file by month or year (e.g., `meta-ads-2026-08.json`) rather than one ever-growing file.

**15.4 Deployment**

- Continue using the existing GitHub repository (technorucs-jp/technorucs-cmo-dashboard) and Vercel auto-deploy pipeline — this design fits Vercel's serverless/static model directly, since there is no backend database to host.
- Provide a plain-language runbook for the CMO covering: how to trigger an out-of-schedule Cowork sync run, how to upload a new LinkedIn XLS and have it converted into `linkedin.json`, and who to contact if a channel's data stops updating (i.e., if `lastSyncedAt` for a channel goes stale).

**16. Acceptance Criteria**

- Selecting any custom start/end date range updates every card, table, and chart on all eight tabs (including the Email placeholder, which simply continues to show its "not yet connected" state) with data recalculated from the `/data` JSON files for that exact range — not interpolated from monthly snapshots.
- Selecting a comparison range correctly recomputes every % change value (e.g., the Channel health table, the three period-comparison blocks, and the Total Leads tab) against that comparison range.
- All KPI figures for a range matching a full calendar month (e.g., June 1–30, 2026) match the corresponding published static dashboard for that month within a small reconciliation tolerance (±1% — allowing for GSC's reporting lag or minor Meta attribution-window differences).
- Zoho CRM lead figures always exclude Partner, Referral, and ZoomInfo sources, for every range selected.
- LinkedIn metrics only display for ranges fully covered by converted upload data in `linkedin.json`; partially or fully uncovered ranges show an explicit data-gap state, not a zero or a stale carry-forward number.
- No API credentials appear anywhere in the web application's code, client-side network calls, or the `/data` JSON files in the public Git repository.
- Every data source's "last synced" timestamp on the dashboard matches the most recent commit that touched its JSON file.
- The CMO (non-technical) can complete a LinkedIn XLS upload and request an out-of-schedule Cowork sync without developer assistance, using the runbook in Section 15.4.
- **(Added v2.3)** Opening the dashboard shows the role popup with CMO selectable; choosing it enters the dashboard on the requested view — a bookmarked or shared URL still lands on that exact tab, date range, and comparison range after Continue, not on a default page.
- **(Added v2.3)** The Section 15.2 access-control decision has been recorded by the CMO — either host-level deployment password protection is enabled, or public access is explicitly accepted in writing. This criterion is about the decision existing, not about which way it went.

**Appendix A — Status Thresholds (starting point, tune with CMO)**

| **Status** | **Rule** |
|---|---|
| Leading | Metric outperforms its comparison period by more than +15%, or outperforms the named competitor benchmark on LinkedIn |
| Good | Metric within ±5% of comparison period, or meeting a defined target band (e.g., GA4 engagement rate ≥ 60%) |
| Monitor | Metric moved unfavourably by 5–30% vs. comparison period |
| Action needed | Metric moved unfavourably by more than 30% vs. comparison period, or is below a defined floor (e.g., GSC non-brand CTR) |

**Appendix B — Data Source Reference**

| **Source** | **Scope for this dashboard** | **Access method** | **Known constraint** |
|---|---|---|---|
| Meta Marketing API | Account 1572040794243205 — campaign/ad set/ad-level spend, delivery, and conversation metrics | Claude Cowork job via MCP connector (ads_read scope), written to `/data/meta-ads.json`, pushed to `main` | None currently — working integration; app itself never calls this API directly |
| Zoho CRM API | Leads module, inbound sources only (Meta Ads, SEO, Social Media, Email Campaign) | Claude Cowork job via MCP connector, criteria search on Created_Time and Lead_Source, written to `/data/zoho-crm.json` | Timezone offset (+05:30) required on all date criteria |
| Google Analytics 4 Data API | Property for technorucs.com | Claude Cowork job via MCP connector, written to `/data/ga4.json` | None currently — working integration |
| Google Search Console API | https://www.technorucs.com/ (URL-prefix property) | Claude Cowork job via MCP connector, written to `/data/gsc.json` | sc-domain: property format does not work for this account; 2–3 day reporting lag |
| LinkedIn Page analytics | Followers, Visitors, Content exports | Manual XLS export by CMO, converted to `/data/linkedin.json` — no live API path available | No live API path currently available; treat as manual upload indefinitely unless LinkedIn approves broader API access |
| Instantly.ai | Outbound email sequence performance | Not yet connected | Out of scope this phase |
| Ubersuggest / backlinks | Domain authority, referring domains, competitor keyword gap | MCP connector, currently unreliable | Out of scope this phase; revisit if a stable API key is available |
