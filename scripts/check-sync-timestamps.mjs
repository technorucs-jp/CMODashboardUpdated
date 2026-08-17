import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'public', 'data')

const CHANNEL_TOLERANCE_DAYS = {
  'meta-ads.json': 30,
  'zoho-crm.json': 30,
  'ga4.json': 30,
  'gsc.json': 30,
  'linkedin.json': 60, // Monthly manual export
}

export function checkSyncTimestamps(dataDir = DATA_DIR, now = new Date()) {
  const errors = []

  for (const [filename, maxDays] of Object.entries(CHANNEL_TOLERANCE_DAYS)) {
    const filePath = join(dataDir, filename)
    if (!existsSync(filePath)) continue

    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
      const lastSyncedAt = parsed.meta?.lastSyncedAt
      if (!lastSyncedAt) {
        errors.push(`[${filename}] missing lastSyncedAt`)
        continue
      }

      const syncTime = new Date(lastSyncedAt).getTime()
      if (isNaN(syncTime)) {
        errors.push(`[${filename}] invalid lastSyncedAt timestamp: ${lastSyncedAt}`)
        continue
      }

      const diffDays = Math.abs(now.getTime() - syncTime) / (1000 * 60 * 60 * 24)
      if (diffDays > maxDays) {
        errors.push(
          `[${filename}] lastSyncedAt (${lastSyncedAt}) is out of sync tolerance (${Math.round(diffDays)} days > ${maxDays} days allowed)`,
        )
      }
    } catch (err) {
      errors.push(`[${filename}] error reading sync timestamp: ${err.message}`)
    }
  }

  return errors
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkSyncTimestamps()
  if (errors.length > 0) {
    console.error('❌ Sync timestamp checks failed:')
    for (const err of errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }
  console.log('✅ All channel sync timestamps are within tolerance.')
  process.exit(0)
}
