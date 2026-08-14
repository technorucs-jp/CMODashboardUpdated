import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'public', 'data')

const REQUIRED_FILES = ['meta-ads.json', 'zoho-crm.json', 'ga4.json', 'gsc.json', 'linkedin.json', 'narratives.json']

export function validateDataDirectory(dataDir = DATA_DIR) {
  const errors = []

  for (const filename of REQUIRED_FILES) {
    const filePath = join(dataDir, filename)
    if (!existsSync(filePath)) {
      errors.push(`[${filename}] File is missing from ${dataDir}`)
      continue
    }

    let parsed
    try {
      const raw = readFileSync(filePath, 'utf8')
      parsed = JSON.parse(raw)
    } catch (err) {
      errors.push(`[${filename}] Invalid JSON format: ${err.message}`)
      continue
    }

    // Gate 1: Check schemaVersion
    if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion <= 0) {
      errors.push(`[${filename}] Missing or invalid schemaVersion`)
    }

    // Gate 2: Check meta envelope for data channel files
    if (filename !== 'narratives.json') {
      if (!parsed.meta || typeof parsed.meta !== 'object') {
        errors.push(`[${filename}] Gate failed: missing 'meta' envelope`)
      } else {
        const { lastSyncedAt, earliestRecordDate, latestRecordDate, rowCounts } = parsed.meta
        if (!lastSyncedAt || isNaN(Date.parse(lastSyncedAt))) {
          errors.push(`[${filename}] Gate failed: invalid or missing meta.lastSyncedAt`)
        }
        if (!earliestRecordDate || !/^\d{4}-\d{2}-\d{2}$/.test(earliestRecordDate)) {
          errors.push(`[${filename}] Gate failed: invalid or missing meta.earliestRecordDate`)
        }
        if (!latestRecordDate || !/^\d{4}-\d{2}-\d{2}$/.test(latestRecordDate)) {
          errors.push(`[${filename}] Gate failed: invalid or missing meta.latestRecordDate`)
        }
        if (earliestRecordDate && latestRecordDate && earliestRecordDate > latestRecordDate) {
          errors.push(`[${filename}] Gate failed: earliestRecordDate (${earliestRecordDate}) is after latestRecordDate (${latestRecordDate})`)
        }
        if (!rowCounts || typeof rowCounts !== 'object') {
          errors.push(`[${filename}] Gate failed: missing meta.rowCounts`)
        }
      }
    }

    // Gate 3: For Zoho CRM — Zero Notes Leak Gate (TAD ADR-012, item 5.5)
    if (filename === 'zoho-crm.json') {
      const rawText = JSON.stringify(parsed)
      if (rawText.includes('"notes"') || rawText.includes('"description"') || rawText.includes('"inquiry_text"')) {
        errors.push(`[zoho-crm.json] Gate failed: forbidden 'notes' or free-text field detected in committed dataset (TAD ADR-012 violation)`)
      }

      if (Array.isArray(parsed.leads)) {
        for (const lead of parsed.leads) {
          if ('notes' in lead || 'description' in lead) {
            errors.push(`[zoho-crm.json] Gate failed: lead object contains prohibited notes/description property`)
            break
          }
        }
      }
    }
  }

  return errors
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateDataDirectory()
  if (errors.length > 0) {
    console.error('❌ Data validation failed with errors:')
    for (const err of errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }
  console.log('✅ All public/data files passed validation gates.')
  process.exit(0)
}
