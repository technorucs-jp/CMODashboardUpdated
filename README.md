# TechnoRUCS CMO Dashboard

A database-free, JSON-backed marketing dashboard for TechnoRUCS's CMO. Vite + React 19 + TypeScript, fully client-side — no application backend.

**Before touching this repo, read `TASK.md`, then `CHECKLIST.md`.** They are the literal, up-to-date build instructions (rewritten 2026-08-10 for the Vite/no-backend architecture — see `Docs/TechnoRUCS_CMO_Dashboard_Technical_Architecture_v1.0.md` §0 for why). `CHECKLIST.md`'s *Session state* block at the top tells you exactly where the build stands.

## Commands

```bash
npm run dev            # local dev server
npm run build           # static production build
npm run preview         # serve the production build locally
npm run typecheck       # tsc --noEmit
npm run lint            # eslint, includes the P5/P6 boundary rules
npm test                # vitest
npm run test:recon      # reconciliation suite only
npm run validate:data   # ajv — every public/data file against /schemas
npm run schemas:build   # regenerate /schemas from Zod
npm run scan:secrets    # credential patterns in public/data and src
```

## Documents

| Doc | Role |
|---|---|
| `TASK.md` | Non-negotiable invariants, tech stack, working protocol, STOP conditions |
| `CHECKLIST.md` | The literal build plan, one item at a time |
| `Docs/TechnoRUCS_CMO_Dashboard_Technical_Architecture_v1.0.md` | Architecture — read §0 first |
| `Docs/TechnoRUCS_CMO_Dashboard_TRD_v1.0.md` | Technical spec |
| `Docs/TechnoRUCS_CMO_Dashboard_RealTime_Requirements_v2.1.md` | Business requirements ("why") |
| `Wireframe/*.jpg` | Frozen visual reference — 25 screens, 8 tabs |
