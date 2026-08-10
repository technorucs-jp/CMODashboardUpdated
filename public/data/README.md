# `public/data/` — deliberately public

**This directory is served as static assets, reachable by direct URL, on purpose.**

That is a reversal of the pre-pivot rule ("never move `/data` into `/public`" — see the
superseded body of `Docs/TechnoRUCS_CMO_Dashboard_Technical_Architecture_v1.0.md` §17 D2
and the old trap it used to warn about). Under the current architecture (TAD §0,
ADR-011/ADR-014) there is no application server, so there is nothing to serve these files
*except* as static assets — the app fetches them directly with `fetch()`.

## What that means for what goes in here

Because there is no server left to redact anything at request time (TAD §0.3, ADR-012),
**the only thing keeping this directory safe to publish is what Cowork chooses to write
into it.** Concretely:

- **`zoho-crm.json` must never contain a `notes` field, or any other lead free-text.**
  This is enforced mechanically by a `.strict()` Zod schema with the field absent
  entirely (see `src/data/schemas.ts` once it exists) — not by a policy someone has to
  remember. If you are looking at a `zoho-crm.json` with a `notes` key in it, in a
  fixture or otherwise, that file is wrong and must not be committed here.
- No API credentials, tokens, or secrets of any kind (P2 — unaffected by the pivot).
  `npm run scan:secrets` scans this directory in CI.
- Nothing else the browser has no legitimate reason to display (P3′, TASK.md §3).

## Why this is still an acceptable trade-off

The login screen (MSAL/Entra) gates the *application UI*, not these files — a direct
request to a file's URL bypasses it, because there is no server left to check a session
before serving a static asset (TAD §16.4, flagged for CMO sign-off before Phase 5
production launch). This directory's exclusion rules are what make that trade-off
acceptable rather than reckless: a leaked file is a stripped-down marketing/CRM aggregate,
never a raw customer message.

See `Docs/TechnoRUCS_CMO_Dashboard_Technical_Architecture_v1.0.md` §0 for the full
architecture, and `TASK.md` §9 for the specific traps this directory invites.
