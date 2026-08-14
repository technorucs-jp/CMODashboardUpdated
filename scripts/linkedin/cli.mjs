import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'
import { convertLinkedInExport } from './convert.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LINKEDIN_JSON_PATH = join(ROOT, 'public', 'data', 'linkedin.json')

export function processLinkedInFiles(filePaths, outputPath = LINKEDIN_JSON_PATH) {
  const sheets = { visitors: [], followers: [], content: [], demographics: [] }

  for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
      console.warn(`⚠️ Warning: file not found: ${filePath}`)
      continue
    }

    const workbook = XLSX.readFile(filePath)
    for (const sheetName of workbook.SheetNames) {
      const lower = sheetName.toLowerCase()
      const jsonRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])

      if (lower.includes('visitor')) {
        sheets.visitors.push(...jsonRows)
      } else if (lower.includes('follower')) {
        sheets.followers.push(...jsonRows)
      } else if (lower.includes('content') || lower.includes('update') || lower.includes('post')) {
        sheets.content.push(...jsonRows)
      } else if (lower.includes('demographic') || lower.includes('industry') || lower.includes('seniority')) {
        sheets.demographics.push(...jsonRows)
      } else {
        // Fallback detection based on keys in first row
        const first = jsonRows[0] || {}
        if ('Page Views' in first) sheets.visitors.push(...jsonRows)
        else if ('New Followers' in first || 'Total Followers' in first) sheets.followers.push(...jsonRows)
        else if ('Impressions' in first || 'Post Title' in first) sheets.content.push(...jsonRows)
      }
    }
  }

  const { data, coverage, warnings } = convertLinkedInExport(sheets)

  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`⚠️ ${w}`)
    }
  }

  if (!coverage) {
    throw new Error('Conversion failed: unable to derive date coverage from the provided files.')
  }

  let existing = {
    schemaVersion: 1,
    meta: {
      lastSyncedAt: new Date().toISOString(),
      earliestRecordDate: coverage.from,
      latestRecordDate: coverage.to,
      rowCounts: { dailyTrend: 0, posts: 0 },
      uploads: [],
    },
    dailyTrend: [],
    posts: [],
  }

  if (existsSync(outputPath)) {
    try {
      existing = JSON.parse(readFileSync(outputPath, 'utf8'))
    } catch {
      // Use clean default
    }
  }

  const uploadEntry = {
    uploadId: `upload-${Date.now()}`,
    uploadedAt: new Date().toISOString(),
    coversFrom: coverage.from,
    coversTo: coverage.to,
  }

  const updatedUploads = [...(existing.meta?.uploads || []), uploadEntry]

  // Merge daily trends (dedupe by date)
  const trendMap = new Map()
  for (const t of existing.dailyTrend || []) trendMap.set(t.date, t)
  for (const t of data.dailyTrend || []) trendMap.set(t.date, t)
  const mergedTrends = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))

  // Merge posts (dedupe by postId)
  const postMap = new Map()
  for (const p of existing.posts || []) postMap.set(p.postId, p)
  for (const p of data.posts || []) postMap.set(p.postId, p)
  const mergedPosts = Array.from(postMap.values()).sort((a, b) => b.date.localeCompare(a.date))

  const earliest = mergedTrends[0]?.date || coverage.from
  const latest = mergedTrends[mergedTrends.length - 1]?.date || coverage.to

  const finalOutput = {
    schemaVersion: 1,
    meta: {
      lastSyncedAt: new Date().toISOString(),
      earliestRecordDate: earliest,
      latestRecordDate: latest,
      rowCounts: {
        dailyTrend: mergedTrends.length,
        posts: mergedPosts.length,
      },
      uploads: updatedUploads,
    },
    dailyTrend: mergedTrends,
    posts: mergedPosts,
    competitors: existing.competitors || [],
    audience: data.audience || existing.audience,
  }

  writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf8')
  console.log(`✅ Successfully updated ${outputPath} (Coverage: ${coverage.from} to ${coverage.to})`)
  return finalOutput
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Usage: npm run convert:linkedin -- <file1.xlsx> <file2.xlsx> ...')
    process.exit(1)
  }
  processLinkedInFiles(args)
}
