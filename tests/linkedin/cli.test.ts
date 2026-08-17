import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { processLinkedInFiles } from '../../scripts/linkedin/cli.mjs'
import { linkedInFileSchema } from '../../src/data/schemas'

/**
 * `processLinkedInFiles` (scripts/linkedin/cli.mjs) is the actual entry point run
 * by `npm run convert:linkedin` for the LinkedIn channel's monthly manual upload
 * (COWORK_SYNC_SPEC.md §2) — the one channel whose ingestion isn't automated.
 * `tests/linkedin/convert.test.ts` only covers the pure `convertLinkedInExport`
 * transform; nothing previously exercised the file I/O wrapper end-to-end, which
 * is how it shipped broken (wrong xlsx import, and an output `meta`/`uploads`
 * shape that didn't match `linkedInFileSchema`'s strict schema at all).
 */
describe('processLinkedInFiles — end-to-end against a real .xlsx and the real schema', () => {
  let dir: string | undefined

  afterEach(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true })
    dir = undefined
  })

  function writeWorkbook(path: string) {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Date: '2026-07-01', 'Page Views': 100, 'Unique Visitors': 50 },
        { Date: '2026-07-02', 'Page Views': 120, 'Unique Visitors': 60 },
      ]),
      'Visitor metrics',
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Date: '2026-07-01', 'New Followers': 5 },
        { Date: '2026-07-02', 'New Followers': 3 },
      ]),
      'Follower stats',
    )
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { 'Post ID': 'p1', 'Post Date': '2026-07-01', 'Post Title': 'Launch post', Impressions: 500, Clicks: 20, Reactions: 10, Comments: 2 },
      ]),
      'Content',
    )
    XLSX.writeFile(wb, path)
  }

  it('produces output that parses cleanly against linkedInFileSchema (a real .strict() schema)', () => {
    dir = mkdtempSync(join(tmpdir(), 'linkedin-cli-test-'))
    const xlsxPath = join(dir, 'export.xlsx')
    const outputPath = join(dir, 'linkedin.json')
    writeWorkbook(xlsxPath)

    const result = processLinkedInFiles([xlsxPath], outputPath)

    const parsed = linkedInFileSchema.safeParse(result)
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error?.issues, null, 2)).toBe(true)

    expect(existsSync(outputPath)).toBe(true)
    const onDisk = JSON.parse(readFileSync(outputPath, 'utf8'))
    expect(linkedInFileSchema.safeParse(onDisk).success).toBe(true)
  })

  it('a second monthly upload without a demographics sheet does not wipe out previously recorded audience data', () => {
    dir = mkdtempSync(join(tmpdir(), 'linkedin-cli-test-'))
    const xlsxPath = join(dir, 'export.xlsx')
    const outputPath = join(dir, 'linkedin.json')
    writeWorkbook(xlsxPath)

    const wbWithDemographics = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wbWithDemographics,
      XLSX.utils.json_to_sheet([{ Date: '2026-06-01', 'Page Views': 10, 'Unique Visitors': 5 }]),
      'Visitor metrics',
    )
    XLSX.utils.book_append_sheet(
      wbWithDemographics,
      XLSX.utils.json_to_sheet([{ Category: 'Seniority', Label: 'Senior', Count: 45 }]),
      'Demographics',
    )
    const firstXlsx = join(dir, 'first.xlsx')
    XLSX.writeFile(wbWithDemographics, firstXlsx)

    processLinkedInFiles([firstXlsx], outputPath)
    const afterFirst = JSON.parse(readFileSync(outputPath, 'utf8'))
    expect(afterFirst.audience.bySeniority).toHaveLength(1)

    // Second upload has no demographics sheet at all.
    processLinkedInFiles([xlsxPath], outputPath)
    const afterSecond = JSON.parse(readFileSync(outputPath, 'utf8'))
    expect(afterSecond.audience.bySeniority).toHaveLength(1)
    expect(afterSecond.audience.bySeniority[0]).toEqual({ level: 'Senior', count: 45 })
  })
})
