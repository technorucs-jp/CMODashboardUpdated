# TechnoRUCS CMO Dashboard — Executive & Operational Runbook

**Audience:** Chief Marketing Officer, Marketing Directors, Sales Leadership, Operations  
**Platform Version:** 1.0 (Single-Page App, Static Architecture)  
**Last Updated:** 2026-08-14  

---

## 1. Opening and Accessing the Dashboard

### 1.1 First Launch & Role Selection
1. Navigate to the dashboard URL: `https://<cmo-dashboard-domain>`.
2. When launching the dashboard for the first time, a **Role Selection Dialog** appears.
3. Select your primary lens:
   - **Executive / CMO:** Focuses on cross-channel ROI, high-level conversion rates, and strategic narrative callouts.
   - **Performance Marketer:** Full granularity on ad sets, zero-click queries, landing pages, and UTM tracking.
   - **Sales Leader:** Lead status distribution, rep assignment balance, and meeting scheduling pipeline.
4. Your choice is persisted locally in your browser. You can change your role at any time via the user profile icon in the top right.

### 1.2 Access & Authentication Notes (ADR-015)
- The dashboard is deployed as a high-performance static client application without corporate Microsoft Entra SSO requirements.
- If deployment password protection is enabled by your administrator (TAD §16.5), enter the workspace password provided by TechnoRUCS IT.
- Lead names and sensitive free-text inquiries are excluded from all dashboard data files by design.

---

## 2. Reading Data Freshness & Sync Badges

Next to the subtitle of every tab is a **Sync Freshness Badge**:

| Badge Appearance | Meaning | Action Required |
|---|---|---|
| **Green / Neutral** (e.g. `Synced 2h ago`) | Data was refreshed recently within normal operating cadence. | None. Figures are up to date. |
| **Amber Warning** (e.g. `Sync delayed: 36h ago`) | Data sync is overdue by more than 2× the expected cadence. | Check if marketing platforms have API rate limits or maintenance. |
| **Red Critical** (e.g. `Stale: 5 days ago`) | Channel sync has stopped. | Contact Data Engineering / Cowork Admin immediately. |

*Hover over any badge to view the exact sync timestamp in Indian Standard Time (IST).*

---

## 3. Uploading LinkedIn XLS Exports (Monthly Cadence)

LinkedIn Organic Social data is imported from monthly XLSX exports:

1. **Download Exports from LinkedIn Campaign Manager / Page Analytics:**
   - Export **Visitors** sheet (`visitors.xlsx`)
   - Export **Followers** sheet (`followers.xlsx`)
   - Export **Content / Updates** sheet (`content.xlsx`)
2. **Run the Ingestion CLI:**
   Place the downloaded spreadsheets in a folder and run:
   ```bash
   npm run convert:linkedin -- path/to/visitors.xlsx path/to/followers.xlsx path/to/content.xlsx
   ```
3. **Verify and Deploy:**
   - The tool automatically derives coverage dates from the sheets, appends the upload record to `meta.uploads[]`, and updates `public/data/linkedin.json`.
   - Commit and push the changes to GitHub to update the live dashboard.

---

## 4. Triggering an Out-of-Schedule Data Sync

If you have just launched a major campaign or updated lead statuses in Zoho and need immediate figures:

1. Go to the GitHub repository: `https://github.com/technorucs/cmo-dashboard`.
2. Navigate to the **Actions** tab.
3. Select **Cowork Automated Data Ingestion**.
4. Click **Run workflow** -> Select `main` branch -> Click **Run workflow**.
5. Within 2–3 minutes, Cowork will fetch the latest records, run validation gates, commit updated JSON files, and deploy to the live dashboard.

---

## 5. Tuning Dashboard Configurations

All business rules, taxonomies, and sales rosters are configurable via JSON files in `public/data/config/` without writing any code:

### 5.1 Adding / Editing Brand Search Terms
- **File:** `public/data/config/brand-terms.json`
- **Purpose:** Determines which search queries in SEO are classified as "Brand" vs "Non-brand".
- **Example:**
  ```json
  {
    "terms": ["technorucs", "techno rucs", "rucs tech", "techno-rucs"]
  }
  ```

### 5.2 Updating the Sales Rep Roster
- **File:** `public/data/config/sales-reps.json`
- **Purpose:** Configures active sales reps on the Leads tab. Inactive reps or reps with 0 assigned leads still render with explicit zero-count rows so concentration bottlenecks remain visible.
- **Example:**
  ```json
  {
    "reps": [
      { "name": "Gopinath", "active": true },
      { "name": "Rathish", "active": true },
      { "name": "Mohan", "active": true }
    ]
  }
  ```

### 5.3 Categorizing Website Page Types
- **File:** `public/data/config/page-types.json`
- **Purpose:** Maps URL paths to content categories (e.g. Service, Talent, Case Study, Solution). Longest prefix matches first.
- **Example:**
  ```json
  {
    "rules": [
      { "prefix": "/services/microsoft-dynamics-365/", "type": "Service" },
      { "prefix": "/talent/", "type": "Talent" },
      { "prefix": "/case-studies/", "type": "Case Study" }
    ],
    "default": "General"
  }
  ```

### 5.4 Tracking LinkedIn Competitors
- **File:** `public/data/config/linkedin-competitors.json`
- **Purpose:** Configures company pages to benchmark against in the LinkedIn engagement table.
- **Example:**
  ```json
  {
    "competitors": [
      { "page": "BytesTechnolab" },
      { "page": "Cognizant" }
    ]
  }
  ```

### 5.5 Adjusting Diagnostic Alert Thresholds
- **File:** `public/data/config/thresholds.json`
- **Purpose:** Configures performance boundaries for the automated Rules & Narrative engine (e.g. Cost/lead outlier multiplier, Stuck in Attempted threshold %, Bot bounce rate %).

---

## 6. Support & Escalation Contacts

If a data channel shows a **Red Stale Badge** or a platform connection fails:

| Issue Area | Responsible Contact | Escalation SLA |
|---|---|---|
| **Zoho CRM Sync / Lead Assignment** | CRM Administrator (`crm-admin@technorucs.com`) | 2 Hours |
| **Meta Ads API / Account Access** | Paid Marketing Lead (`ads@technorucs.com`) | 4 Hours |
| **GA4 / GSC Verification** | SEO & Web Analytics Team (`seo@technorucs.com`) | 8 Hours |
| **Dashboard Build / Pipeline Issues** | Engineering On-Call (`devops@technorucs.com`) | 1 Hour |
