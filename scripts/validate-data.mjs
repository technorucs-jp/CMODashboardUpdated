import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'public', 'data')

const REQUIRED_FILES = ['meta-ads.json', 'zoho-crm.json', 'ga4.json', 'gsc.json', 'linkedin.json', 'narratives.json']

// Row-count drops of up to this fraction are allowed without an override (spec §6 gate 4).
const MAX_ROW_COUNT_DROP_FRACTION = 0.5

/**
 * Reads the version of `dataDir/filename` currently at HEAD (i.e. what's already
 * live), so a candidate write — sitting in the working tree right before Cowork's
 * step 10 commit (COWORK_SYNC_SPEC.md §5) — can be diffed against it. Returns
 * `null` for anything that isn't a regression signal in itself: no git repo, the
 * file didn't exist at HEAD yet (first sync), or HEAD's copy doesn't parse —
 * there is nothing to compare against, not a validation failure.
 */
function readPreviousCommittedJson(dataDir, filename) {
  const gitPath = relative(ROOT, join(dataDir, filename)).split('\\').join('/')
  try {
    const raw = execFileSync('git', ['show', `HEAD:${gitPath}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function validateDataDirectory(dataDir = DATA_DIR, { getPreviousCommittedJson = readPreviousCommittedJson } = {}) {
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

        // Gates 3 & 4 compare against what's currently committed (HEAD) — the
        // "previous commit" the spec's gates 3/4 refer to (§6). Skipped when
        // there is nothing to compare against (new file, not a git repo, or a
        // HEAD copy that doesn't parse) — that is not itself a regression.
        const previous = getPreviousCommittedJson(dataDir, filename)
        const prevMeta = previous && typeof previous === 'object' ? previous.meta : null

        if (prevMeta && typeof prevMeta === 'object') {
          // Gate 3: No Chronological Reversal
          if (
            typeof latestRecordDate === 'string' &&
            typeof prevMeta.latestRecordDate === 'string' &&
            latestRecordDate < prevMeta.latestRecordDate
          ) {
            errors.push(
              `[${filename}] Gate failed: meta.latestRecordDate moved backward (${prevMeta.latestRecordDate} -> ${latestRecordDate})`,
            )
          }

          // Gate 4: No Severe Row Count Drop (bypassable via VALIDATE_ALLOW_ROW_COUNT_DROP=1,
          // the spec's "explicit human override flag")
          if (
            rowCounts &&
            typeof rowCounts === 'object' &&
            prevMeta.rowCounts &&
            typeof prevMeta.rowCounts === 'object' &&
            process.env.VALIDATE_ALLOW_ROW_COUNT_DROP !== '1'
          ) {
            for (const [key, prevCount] of Object.entries(prevMeta.rowCounts)) {
              if (typeof prevCount !== 'number' || prevCount <= 0) continue
              const currentCount = typeof rowCounts[key] === 'number' ? rowCounts[key] : 0
              if (currentCount < prevCount * (1 - MAX_ROW_COUNT_DROP_FRACTION)) {
                errors.push(
                  `[${filename}] Gate failed: meta.rowCounts.${key} dropped by more than ${MAX_ROW_COUNT_DROP_FRACTION * 100}% (${prevCount} -> ${currentCount}); set VALIDATE_ALLOW_ROW_COUNT_DROP=1 to override`,
                )
              }
            }
          }
        }
      }
    }

    // Gate 5: For Zoho CRM — Zero Notes Leak Gate (TAD ADR-012, item 5.5)
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
