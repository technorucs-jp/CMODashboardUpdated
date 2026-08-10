#!/usr/bin/env node
/**
 * build-schemas.mjs — TASK.md §7.4 / CHECKLIST.md item 1.9.
 *
 * Generates /schemas/*.schema.json from the Zod schemas in src/data/schemas.ts,
 * so the Zod definitions stay the single TypeScript source of truth (TAD §7.4) —
 * the JSON Schema files exist for `scripts/validate-data.mjs` (ajv, CI) and cannot
 * diverge from what the app itself validates against, because they're generated
 * from the exact same object.
 *
 * Runs under plain Node — this Node version strips TypeScript types natively, no
 * ts-node/tsx needed (confirmed: `node --version` → v24; type-only annotations in
 * schemas.ts are erasable syntax, no enums/namespaces requiring a transform step).
 *
 * Uses Zod v4's own native `z.toJSONSchema()`, not the third-party `zod-to-json-schema`
 * package TASK.md §4 originally pinned — that package predates Zod v4's internal
 * schema representation and silently produces an empty `{}` definition against it
 * (verified: ran it, got `{"$ref":"#/definitions/meta-ads","definitions":{"meta-ads":{}}}`).
 * Zod v4 ships the exact capability that package existed for, as a first-party API,
 * so this is a strict improvement (fewer deps, guaranteed compatibility) rather than
 * an architecture change — no invariant or decision record is affected, just a
 * broken shim swapped for its now-official replacement.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import {
  metaAdsFileSchema,
  zohoCrmFileSchema,
  ga4FileSchema,
  gscFileSchema,
  linkedInFileSchema,
  narrativesFileSchema,
} from '../src/data/schemas.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const schemasDir = join(__dirname, '..', 'schemas')

const CHANNEL_SCHEMAS = {
  'meta-ads': metaAdsFileSchema,
  'zoho-crm': zohoCrmFileSchema,
  ga4: ga4FileSchema,
  gsc: gscFileSchema,
  linkedin: linkedInFileSchema,
  narratives: narrativesFileSchema,
}

mkdirSync(schemasDir, { recursive: true })

for (const [name, schema] of Object.entries(CHANNEL_SCHEMAS)) {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-2020-12' })
  const outPath = join(schemasDir, `${name}.schema.json`)
  // Trailing newline so re-running produces no diff against a file written by a
  // text editor / git — JSON.stringify alone doesn't add one.
  writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + '\n')
  console.log(`wrote ${outPath}`)
}
