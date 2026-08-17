import { describe, expect, it } from 'vitest'
import { validateDataDirectory } from '../../scripts/validate-data.mjs'
import { checkSyncTimestamps } from '../../scripts/check-sync-timestamps.mjs'
import { scanSecretsInDirectory } from '../../scripts/scan-secrets.mjs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const TMP_TEST_DATA = join(ROOT, 'tests', 'fixtures', 'tmp-validation-test')

describe('Validation, Sync Timestamps, and Security Scripts (items 5.4, 5.5, 5.6, 5.25)', () => {
  it('validateDataDirectory exits clean against real public/data files', () => {
    const errors = validateDataDirectory(join(ROOT, 'public', 'data'))
    expect(errors).toEqual([])
  })

  it('validateDataDirectory catches missing meta, backward dates, and forbidden notes fields (item 5.5)', () => {
    if (existsSync(TMP_TEST_DATA)) rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    mkdirSync(TMP_TEST_DATA, { recursive: true })

    // Broken meta file
    writeFileSync(
      join(TMP_TEST_DATA, 'meta-ads.json'),
      JSON.stringify({ schemaVersion: 1, facts: [] }), // missing meta
    )

    // Zoho file with forbidden notes field
    writeFileSync(
      join(TMP_TEST_DATA, 'zoho-crm.json'),
      JSON.stringify({
        schemaVersion: 1,
        meta: {
          lastSyncedAt: '2026-08-14T09:00:00+05:30',
          earliestRecordDate: '2026-06-30',
          latestRecordDate: '2026-06-01', // backward date!
          rowCounts: { leads: 1 },
        },
        leads: [{ leadId: '1', notes: 'customer requested quotation' }],
      }),
    )

    const errors = validateDataDirectory(TMP_TEST_DATA)
    expect(errors.some((e) => e.includes("missing 'meta' envelope"))).toBe(true)
    expect(errors.some((e) => e.includes('earliestRecordDate') && e.includes('is after latestRecordDate'))).toBe(true)
    expect(errors.some((e) => e.includes("forbidden 'notes' or free-text field detected"))).toBe(true)

    rmSync(TMP_TEST_DATA, { recursive: true, force: true })
  })

  it('validateDataDirectory catches a chronological reversal against the previously committed file (spec §6 gate 3)', () => {
    if (existsSync(TMP_TEST_DATA)) rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    mkdirSync(TMP_TEST_DATA, { recursive: true })

    writeFileSync(
      join(TMP_TEST_DATA, 'meta-ads.json'),
      JSON.stringify({
        schemaVersion: 1,
        meta: {
          lastSyncedAt: '2026-08-14T09:00:00+05:30',
          earliestRecordDate: '2026-08-01',
          latestRecordDate: '2026-08-09', // regressed vs. the "previous commit" below
          rowCounts: { facts: 500 },
        },
      }),
    )

    const getPreviousCommittedJson = () => ({
      meta: { latestRecordDate: '2026-08-13', rowCounts: { facts: 500 } },
    })

    const errors = validateDataDirectory(TMP_TEST_DATA, { getPreviousCommittedJson })
    expect(errors.some((e) => e.includes('moved backward') && e.includes('2026-08-13 -> 2026-08-09'))).toBe(true)

    rmSync(TMP_TEST_DATA, { recursive: true, force: true })
  })

  it('validateDataDirectory catches a >50% row count drop against the previously committed file (spec §6 gate 4)', () => {
    if (existsSync(TMP_TEST_DATA)) rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    mkdirSync(TMP_TEST_DATA, { recursive: true })

    writeFileSync(
      join(TMP_TEST_DATA, 'meta-ads.json'),
      JSON.stringify({
        schemaVersion: 1,
        meta: {
          lastSyncedAt: '2026-08-14T09:00:00+05:30',
          earliestRecordDate: '2026-08-01',
          latestRecordDate: '2026-08-14',
          rowCounts: { facts: 100 }, // was 569 — a >50% drop, e.g. a truncated API pull
        },
      }),
    )

    const getPreviousCommittedJson = () => ({
      meta: { latestRecordDate: '2026-08-13', rowCounts: { facts: 569 } },
    })

    const errors = validateDataDirectory(TMP_TEST_DATA, { getPreviousCommittedJson })
    expect(errors.some((e) => e.includes('rowCounts.facts dropped') && e.includes('569 -> 100'))).toBe(true)

    rmSync(TMP_TEST_DATA, { recursive: true, force: true })
  })

  it('validateDataDirectory allows a row count drop when VALIDATE_ALLOW_ROW_COUNT_DROP=1 is set (human override)', () => {
    if (existsSync(TMP_TEST_DATA)) rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    mkdirSync(TMP_TEST_DATA, { recursive: true })

    writeFileSync(
      join(TMP_TEST_DATA, 'meta-ads.json'),
      JSON.stringify({
        schemaVersion: 1,
        meta: {
          lastSyncedAt: '2026-08-14T09:00:00+05:30',
          earliestRecordDate: '2026-08-01',
          latestRecordDate: '2026-08-14',
          rowCounts: { facts: 10 },
        },
      }),
    )

    const getPreviousCommittedJson = () => ({
      meta: { latestRecordDate: '2026-08-13', rowCounts: { facts: 569 } },
    })

    const original = process.env.VALIDATE_ALLOW_ROW_COUNT_DROP
    process.env.VALIDATE_ALLOW_ROW_COUNT_DROP = '1'
    try {
      const errors = validateDataDirectory(TMP_TEST_DATA, { getPreviousCommittedJson })
      expect(errors.some((e) => e.includes('rowCounts.facts dropped'))).toBe(false)
    } finally {
      if (original === undefined) delete process.env.VALIDATE_ALLOW_ROW_COUNT_DROP
      else process.env.VALIDATE_ALLOW_ROW_COUNT_DROP = original
      rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    }
  })

  it('validateDataDirectory skips gates 3/4 cleanly when there is no previous committed version (new channel file)', () => {
    if (existsSync(TMP_TEST_DATA)) rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    mkdirSync(TMP_TEST_DATA, { recursive: true })

    writeFileSync(
      join(TMP_TEST_DATA, 'meta-ads.json'),
      JSON.stringify({
        schemaVersion: 1,
        meta: {
          lastSyncedAt: '2026-08-14T09:00:00+05:30',
          earliestRecordDate: '2026-08-01',
          latestRecordDate: '2026-08-14',
          rowCounts: { facts: 1 },
        },
      }),
    )

    const errors = validateDataDirectory(TMP_TEST_DATA, { getPreviousCommittedJson: () => null })
    expect(errors.some((e) => e.includes('moved backward') || (e.includes('rowCounts') && e.includes('dropped')))).toBe(false)

    rmSync(TMP_TEST_DATA, { recursive: true, force: true })
  })

  it('checkSyncTimestamps catches out-of-tolerance sync dates (item 5.6)', () => {
    if (existsSync(TMP_TEST_DATA)) rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    mkdirSync(TMP_TEST_DATA, { recursive: true })

    writeFileSync(
      join(TMP_TEST_DATA, 'meta-ads.json'),
      JSON.stringify({
        schemaVersion: 1,
        meta: { lastSyncedAt: '2025-01-01T00:00:00Z' }, // 1.5 years old
      }),
    )

    const errors = checkSyncTimestamps(TMP_TEST_DATA, new Date('2026-08-14T09:00:00+05:30'))
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain('out of sync tolerance')

    rmSync(TMP_TEST_DATA, { recursive: true, force: true })
  })

  it('checkSyncTimestamps defaults "now" to the real current time, not a fixed past date', () => {
    // Regression test: the default third argument used to be a hardcoded literal
    // (`new Date('2026-08-14T09:00:00+05:30')`), which the CI workflow's bare
    // `npm run check:sync` relies on implicitly (checkSyncTimestamps() with no
    // args). A frozen default silently drifts further from real time every day
    // and would eventually make this gate reject genuinely fresh, same-day syncs
    // as "stale" for a reason with nothing to do with actual sync health.
    if (existsSync(TMP_TEST_DATA)) rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    mkdirSync(TMP_TEST_DATA, { recursive: true })

    writeFileSync(
      join(TMP_TEST_DATA, 'meta-ads.json'),
      JSON.stringify({
        schemaVersion: 1,
        meta: { lastSyncedAt: new Date().toISOString() }, // synced this instant
      }),
    )

    // Calling with only `dataDir` exercises the real default, not an injected `now`.
    const errors = checkSyncTimestamps(TMP_TEST_DATA)
    expect(errors).toEqual([])

    rmSync(TMP_TEST_DATA, { recursive: true, force: true })
  })

  it('scanSecretsInDirectory detects API keys and leaked lead notes (item 5.25)', () => {
    if (existsSync(TMP_TEST_DATA)) rmSync(TMP_TEST_DATA, { recursive: true, force: true })
    mkdirSync(TMP_TEST_DATA, { recursive: true })

    // The fixture value is deliberately NOT shaped like a real vendor key. The
    // scanner's "Generic API Key" rule fires on the `"apiKey": "<16+ chars>"`
    // shape, not on any provider's prefix, so a neutral placeholder exercises
    // exactly the same code path. An earlier version used a Stripe-style
    // `sk_live_…` string, which GitHub's push protection then blocked as a real
    // leaked credential — a synthetic secret in a scanner's own test is still a
    // secret as far as any scanner is concerned.
    writeFileSync(
      join(TMP_TEST_DATA, 'leak.json'),
      JSON.stringify({ apiKey: 'EXAMPLE_FAKE_KEY_0123456789abcdef', notes: 'customer inquiry' }),
    )

    const findings = scanSecretsInDirectory(TMP_TEST_DATA)
    expect(findings.length).toBeGreaterThan(0)

    rmSync(TMP_TEST_DATA, { recursive: true, force: true })
  })
})
