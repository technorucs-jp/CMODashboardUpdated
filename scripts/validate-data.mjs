#!/usr/bin/env node
/**
 * validate-data.mjs — TASK.md §7.4 / CHECKLIST.md items 1.20 (baseline) and 5.4
 * (the additional validation gates below the schema check).
 *
 * Usage: node scripts/validate-data.mjs [directory]   (default: public/data)
 *
 * Validates every recognised channel file in the target directory against its
 * generated JSON Schema (schemas/*.schema.json, built from the Zod source of
 * truth — item 1.9). Built ahead of its own item (5.4) because item 1.20's
 * fixtures need something to validate against immediately — this is the
 * baseline; 5.4 adds the extra gates (missing meta, latestRecordDate moving
 * backward, row-count drop > 50%) as an extension, not a rewrite.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const schemasDir = join(repoRoot, 'schemas')

const targetDir = process.argv[2] ? join(repoRoot, process.argv[2]) : join(repoRoot, 'public', 'data')

const CHANNEL_FILES = ['meta-ads', 'zoho-crm', 'ga4', 'gsc', 'linkedin', 'narratives']

const ajv = new Ajv2020.default({ allErrors: true, strict: false })

let hadFailure = false
let checked = 0

for (const name of CHANNEL_FILES) {
  const dataPath = join(targetDir, `${name}.json`)
  if (!existsSync(dataPath)) {
    continue // not every fixture set carries every file (e.g. narratives is optional per ADR-004)
  }

  const schemaPath = join(schemasDir, `${name}.schema.json`)
  if (!existsSync(schemaPath)) {
    console.error(`✗ ${name}.json — no schema found at ${schemaPath}. Run 'npm run schemas:build' first.`)
    hadFailure = true
    continue
  }

  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
  const validate = ajv.compile(schema)
  const data = JSON.parse(readFileSync(dataPath, 'utf8'))
  checked++

  if (validate(data)) {
    console.log(`✓ ${name}.json`)
  } else {
    console.error(`✗ ${name}.json`)
    for (const err of validate.errors ?? []) {
      console.error(`  ${err.instancePath || '(root)'} ${err.message}`)
    }
    hadFailure = true
  }
}

if (checked === 0) {
  console.error(`No recognised channel files found in ${targetDir}`)
  process.exit(1)
}

// List anything present in the directory that isn't a recognised channel file —
// visibility, not a failure (config/ subdirectory and README.md are expected).
try {
  const entries = readdirSync(targetDir)
  const unrecognised = entries.filter(
    (e) => e.endsWith('.json') && !CHANNEL_FILES.includes(e.replace(/\.json$/, '')),
  )
  if (unrecognised.length > 0) {
    console.log(`(unrecognised JSON files present, not validated: ${unrecognised.join(', ')})`)
  }
} catch {
  // targetDir might not exist yet in a fresh checkout — not this script's concern.
}

process.exit(hadFailure ? 1 : 0)
