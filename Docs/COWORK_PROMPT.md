# Cowork Sync — Session Prompt

The prompt to paste into a scheduled Claude Cowork session that refreshes
`public/data/**` and pushes to `main`.

Two prompts are given: **§A the recurring run** (every scheduled sync) and
**§B the one-time first run** (replacing today's sample data). Use §B once, then
§A forever after.

Both deliberately point at `Docs/COWORK_SYNC_SPEC.md` rather than restating it —
the spec is the contract, and a prompt that paraphrases it will drift from it.

---

## §A — Recurring sync prompt

> You are the scheduled ingestion job for the TechnoRUCS CMO Dashboard
> (`technorucs-jp/CMODashboardUpdated`, branch `main`).
>
> **Read `Docs/COWORK_SYNC_SPEC.md` in full before doing anything.** It is the
> contract for this task: cadences, lookback windows, natural keys, the 12-step
> algorithm, the validation gates, and the commit format. Follow it exactly. If
> anything below appears to conflict with the spec, the spec wins — stop and say so.
>
> **Your task:** run one full sync pass — steps 1 to 12 of spec §5 — for these
> four channels. LinkedIn is upload-driven and is **not** part of an automated
> run; leave `linkedin.json` untouched unless I have given you a new XLS export.
>
> | Channel | Source | Query constraints |
> |---|---|---|
> | Meta Ads | Meta Marketing API via MCP | Account `1572040794243205`. Ad-set level, 7-day lookback. Capture the account Opportunity Score into `account[]`. |
> | Zoho CRM | Zoho CRM MCP | Leads module. 14-day lookback on **both `Modified_Time` and `Created_Time`** (spec §3 — status mutates after creation). All date criteria in IST (+05:30). `Lead_Source` in (Meta Ads, SEO, Social Media, Email Campaign) — Partner, Referral and ZoomInfo are excluded at ingestion, always. |
> | GA4 | GA4 Data API MCP | technorucs.com property, 3-day lookback. Decompose rates per spec §4.1. |
> | GSC | Search Console API MCP | `siteUrl = https://www.technorucs.com/` — the trailing slash is required; the `sc-domain:` form returns nothing for this account. 3-day lookback. Decompose position per spec §4.2. |
>
> **Five invariants. Violating any of these is a failed run, not a judgement call:**
>
> 1. **Never write `notes`** — or `description`, `inquiry_text`, or any lead
>    free-text — into `zoho-crm.json`. `public/data/` is served publicly, so a
>    field written here is a field published to the internet. Read notes via the
>    API if you need them for your own processing, then drop them before writing.
> 2. **Never store a computed ratio.** No `bounceRate`, `avgPosition`, `ctr`,
>    `cpc`, `cpm`, `engagementRate`, `costPerConversation`. Store the numerator
>    and denominator counts; the dashboard derives every rate for whatever range
>    the CMO selects. Spec §4 gives the two decompositions.
> 3. **Never pre-aggregate away day granularity.** One row per day per dimension.
>    Monthly totals would make an arbitrary date range unanswerable.
> 4. **One clock: Asia/Kolkata (+05:30).** Every date bucket and every timestamp.
> 5. **Never commit a credential.** No tokens, keys or connector config in any
>    file under `public/data/`.
>
> **Before committing, run the gates yourself:**
> ```
> npm run validate:data && npm run scan:secrets
> ```
> If either fails, **abort — do not commit, do not push.** Report what failed,
> what the offending value was, and leave the working tree for a human. A failed
> gate means the data is wrong; committing it publishes the error and
> auto-deploys it.
>
> **If both pass**, commit only `public/data/*.json` using the exact message
> format in spec §7, then push to `main`. Vercel deploys on push.
>
> **Finally, report back:** per channel — rows written, `latestRecordDate`, and
> the row-count delta versus the previous run. Call out anything that looks off
> even if the gates passed (a channel returning zero rows, a sudden 10x change, a
> `latestRecordDate` older than you expected).

---

## §B — First run only: replacing the sample data

`public/data/**` currently holds **generated sample data**, not real figures —
`meta.coworkRunId` reads `run_2026-08-10T0900` and the dates span the May–July
2026 fixture range. The first real sync has to replace it, and that runs into a
trap worth handling deliberately rather than discovering mid-run.

**The trap.** Validation gate 4 (spec §6) aborts when any channel's row count
drops by more than 50% against the previous commit. The sample data is dense —
569 Meta fact rows, 129 leads, 92 GA4 daily rows, 92 GSC daily rows. A first real
sync using the normal short lookbacks (7 days for Meta, 3 for GA4/GSC) produces
far fewer rows than that, so **the gate will fire and abort the run** — correctly,
by its own logic, but for the wrong reason: nothing regressed, the baseline was
simply fictional.

Pick one of these before the first run:

**Option 1 — clear the baseline first (recommended).** Commit the removal of the
sample files, so the first real sync is treated as a genuine first sync and gates
3 and 4 skip cleanly (they have nothing to compare against):

```bash
git rm public/data/meta-ads.json public/data/zoho-crm.json \
       public/data/ga4.json public/data/gsc.json
git commit -m "Clear sample data ahead of first real Cowork sync"
git push origin main
```

Note the dashboard will show its explicit "no data" states between this commit
and the first successful sync — which is correct behaviour, not breakage.

**Option 2 — backfill instead.** Have the first run use a lookback long enough to
cover the same span as the sample data (May 2026 → today) rather than the normal
short window. Row counts then stay comparable and the gate passes on its merits.
Slower and heavier on API quota, but it gives you real history immediately.

**Option 3 — override once.** Run the first sync with
`VALIDATE_ALLOW_ROW_COUNT_DROP=1`, the spec's "explicit human override flag".
Use this only if you have looked at the numbers and are satisfied the drop is the
sample-to-real transition and nothing else.

Then append to the §A prompt:

> **This is the first real sync.** `public/data/` currently contains generated
> sample data, not real figures — every number in it is fictional and must be
> fully replaced, not merged with. Do not treat the existing rows as a baseline
> to upsert into: discard them and write what the APIs actually return.
>
> I have already [cleared the sample files / want you to backfill from
> 2026-05-01 / am authorising `VALIDATE_ALLOW_ROW_COUNT_DROP=1` for this run
> only] — **‹pick one and delete the others›**.
>
> After the run, confirm explicitly that `meta.coworkRunId` on every file is your
> new run ID and that no file still carries `run_2026-08-10T0900`. That string is
> the marker of the sample data; if it survives anywhere, the replacement was
> incomplete.

---

## Notes

- **LinkedIn stays manual.** There is no usable API for this Page (BRD §11).
  It is refreshed by converting a CMO-supplied XLS export —
  `npm run convert:linkedin -- <paths>` — not by the scheduled job. A range not
  covered by `meta.uploads[]` renders an explicit gap state rather than a zero,
  which is intended.
- **Narratives.** Spec step 8 has Cowork append phrasings to `narratives.json`
  for newly seen flag IDs. Phrasing only — never numbers. The dashboard computes
  every figure live and fills the `{placeholders}`, so a phrasing containing a
  hardcoded number would go stale the moment the range changes. Every rule already
  ships a built-in default, so skipping this step degrades wording, never
  correctness.
- **Scheduling.** Spec §2 sets the cadences: Meta daily 06:00 IST, GA4 07:00,
  GSC 07:30, Zoho hourly across 08:00–20:00.
