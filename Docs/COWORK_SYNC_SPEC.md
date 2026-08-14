# TechnoRUCS CMO Dashboard — Cowork Ingestion Contract & Sync Specification

**Document Version:** 1.0  
**Effective Date:** 2026-08-14  
**Author:** TechnoRUCS Data Engineering / Cowork Agent Architecture  
**Scope:** Automated ingestion pipeline from Zoho CRM, Meta Ads, GA4, GSC, and LinkedIn into `public/data/` (TAD §8, ADR-012, ADR-013).

---

## 1. Core Architecture & Destination Path

1. **Target Directory:** Cowork executes in CI/cron and writes static JSON files directly to **`public/data/`** (not a server-only `data/` root). The dashboard is a pure Client-Side SPA (ADR-011, ADR-015) hosted on static CDN.
2. **PII and Notes Exclusion Rule (TAD ADR-012):**
   - In `zoho-crm.json`, the `notes` field (and any free-text lead description / inquiry body) **MUST NEVER BE COMMITTED** to `public/data/zoho-crm.json`.
   - Cowork reads `notes` via API solely for its own ephemeral processing (e.g. eventual intent classification / LLM summaries), but scrubs all free-text fields before committing JSON to git.
   - **Reason:** Static deployment means files in `public/data/` are publicly downloadable. Excluding `notes` at ingestion is the architectural boundary protecting customer lead text from exposure (TAD §16.4).

---

## 2. Channel Ingestion Cadence & Lookback Windows

| Channel | Filename | Ingestion Cadence | Lookback Window | Primary Key (Natural Key) | Key Invariants |
|---|---|---|---|---|---|
| **Meta Ads** | `public/data/meta-ads.json` | Daily (06:00 IST) | 7 days | `adSetId + date` | Additive spend, impressions, clicks, conversations. Reach is daily snapshot only. |
| **Zoho CRM** | `public/data/zoho-crm.json` | Hourly / Daily (08:00–20:00 IST) | 14 days on `Modified_Time` AND `Created_Time` | `leadId` | **MUST look back on `Modified_Time`** because lead status mutates after creation (TAD D9). `notes` omitted. |
| **GA4** | `public/data/ga4.json` | Daily (07:00 IST) | 3 days | `date + country + device + channelGroup` | Ratios decomposed: `bouncedSessions` stored instead of `bounceRate`. |
| **GSC** | `public/data/gsc.json` | Daily (07:30 IST) | 3 days (GSC API lag) | `date + query + page + country + device` | Ratios decomposed: `sumPosition` stored instead of `avgPosition`. |
| **LinkedIn** | `public/data/linkedin.json` | Monthly manual export upload | Full uploaded period | `uploadId + date` | Gated by `meta.uploads[]`. Multi-month ranges require complete coverage across uploads. |

---

## 3. Zoho CRM Lookback Requirements (Item 5.2)

- **Requirement:** Zoho ingestion queries MUST filter on `Modified_Time >= now() - 14d` as well as `Created_Time >= now() - 14d`.
- **Rationale (TAD D9):** Leads created 10 days ago may move from "Attempted to Contact" to "Contacted" or "Meeting Scheduled" today. A query keying only on `Created_Time` would miss downstream lifecycle status transitions, permanently corrupting the contact rate and sales rep performance tables.

---

## 4. Ratio Decomposition Rules (Item 5.3)

To ensure mathematically sound time aggregation across arbitrary ranges (P1 / TAD ADR-007), all ratios are decomposed into numerator and denominator counts before writing JSON:

### 4.1 GA4 Bounce Rate Decomposition
- **Input from API:** `sessions: 100`, `bounceRate: 0.35` (or `engagementRate: 0.65`).
- **Ingestion Computation:**
  ```
  bouncedSessions = Math.round(sessions * bounceRate) = 35
  engagedSessions = sessions - bouncedSessions = 65
  ```
- **Committed File Structure:** Stores `engagedSessions: 65` and `bouncedSessions: 35`.
- **Read-Time Derivation:**
  $$\text{Bounce Rate} = \frac{\sum \text{bouncedSessions}}{\sum (\text{engagedSessions} + \text{bouncedSessions})}$$

### 4.2 GSC Average Position Decomposition
- **Input from API:** `impressions: 200`, `position: 14.5`.
- **Ingestion Computation:**
  ```
  sumPosition = impressions * position = 200 * 14.5 = 2900
  ```
- **Committed File Structure:** Stores `impressions: 200` and `sumPosition: 2900`.
- **Read-Time Derivation:**
  $$\text{Average Position} = \frac{\sum \text{sumPosition}}{\sum \text{impressions}}$$

---

## 5. The 12-Step Ingestion Algorithm

Every automated sync run by Cowork follows this exact 12-step pipeline:

1. **Acquire Lock:** Ensure single-run concurrency via Git lock / CI mutex.
2. **Fetch Channel APIs:** Query APIs with respective lookback windows (Zoho on `Modified_Time`, Meta on 7d lookback, GA4 on 3d, GSC on 3d).
3. **Decompose Ratios:** Compute `sumPosition`, `bouncedSessions`, and `engagedSessions`.
4. **Scrub PII & Notes:** Strip `notes`, phone numbers, email text, and unapproved free-text fields.
5. **Merge with Existing Dataset:** Match records by natural keys (`leadId`, `adSetId+date`, etc.), upserting updated rows and appending new ones.
6. **Update Metadata Envelope:**
   - Set `meta.lastSyncedAt` to current ISO timestamp (e.g. `2026-08-14T09:00:00+05:30`).
   - Set `meta.latestRecordDate` to maximum date found in dataset.
   - Set `meta.earliestRecordDate` to minimum date found in dataset.
   - Set `meta.coworkRunId` and `meta.rowCounts`.
7. **Evaluate Rules Engine:** Run pure rules pass (`evaluateRules`) over the latest period to generate diagnostics flags.
8. **Draft Missing Phrasings:** Append phrasings to `public/data/narratives.json` for any newly discovered flag IDs (never hardcoding numbers into phrasing templates).
9. **Run Ingestion Validation Gates (§6):** Execute schema and sanity validation. If any gate fails, ABORT and alert.
10. **Commit Changes:** Stage `public/data/*.json` and commit with standard commit message format (§7).
11. **Push to Remote:** Push commit to GitHub to trigger Vercel deployment.
12. **Post Sync Telemetry:** Log sync summary and row count deltas to monitoring webhook.

---

## 6. Ingestion Validation Gates (TAD §8.3)

Before committing, the validation script (`scripts/validate-data.mjs`) asserts:
1. **Schema Validity:** Strict Zod / Ajv validation against `src/data/schemas.ts`.
2. **Envelope Completeness:** `meta.lastSyncedAt`, `meta.earliestRecordDate`, and `meta.latestRecordDate` must be valid ISO dates.
3. **No Chronological Reversal:** `latestRecordDate` must never move backward compared to the previous commit.
4. **No Severe Row Count Drop:** `rowCounts` for any channel must not decrease by > 50% without explicit human override flag.
5. **Zero Notes Leak Gate:** `zoho-crm.json` MUST contain ZERO instances of `"notes"`, `"description"`, or `"inquiry_text"` keys.

---

## 7. Commit Message Format

Automated commits from Cowork follow the standard pattern:
```
data(sync): channel updates for 2026-08-14 [run_2026-08-14T0900]

- meta-ads: 128 rows (latest: 2026-08-13)
- zoho-crm: 142 leads (latest: 2026-08-14) [modified lookback applied]
- ga4: 310 sessions (latest: 2026-08-13)
- gsc: 840 queries (latest: 2026-08-11)
```
