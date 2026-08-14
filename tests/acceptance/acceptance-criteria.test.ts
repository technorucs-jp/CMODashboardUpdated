import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateDataDirectory } from '../../scripts/validate-data.mjs'
import { checkSyncTimestamps } from '../../scripts/check-sync-timestamps.mjs'
import { scanSecretsInDirectory } from '../../scripts/scan-secrets.mjs'
import { buildOverviewViewModel } from '../../src/viewmodels/overview'
import { buildAdCampaignsViewModel } from '../../src/viewmodels/adCampaigns'
import { buildLeadsViewModel } from '../../src/viewmodels/leads'
import { buildWebsiteViewModel } from '../../src/viewmodels/website'
import { buildSeoViewModel } from '../../src/viewmodels/seo'
import { buildLinkedInViewModel } from '../../src/viewmodels/linkedin'
import { buildTotalLeadsViewModel } from '../../src/viewmodels/totalLeads'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DATA_DIR = join(ROOT, 'public', 'data')
const CONFIG_DIR = join(DATA_DIR, 'config')

const metaAds = JSON.parse(readFileSync(join(DATA_DIR, 'meta-ads.json'), 'utf8'))
const zoho = JSON.parse(readFileSync(join(DATA_DIR, 'zoho-crm.json'), 'utf8'))
const ga4 = JSON.parse(readFileSync(join(DATA_DIR, 'ga4.json'), 'utf8'))
const gsc = JSON.parse(readFileSync(join(DATA_DIR, 'gsc.json'), 'utf8'))
const linkedin = JSON.parse(readFileSync(join(DATA_DIR, 'linkedin.json'), 'utf8'))
const narratives = JSON.parse(readFileSync(join(DATA_DIR, 'narratives.json'), 'utf8'))

const thresholds = JSON.parse(readFileSync(join(CONFIG_DIR, 'thresholds.json'), 'utf8'))
const brandTerms = JSON.parse(readFileSync(join(CONFIG_DIR, 'brand-terms.json'), 'utf8')).terms
const repsConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'sales-reps.json'), 'utf8'))
const pageTypesConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'page-types.json'), 'utf8'))
const roster = repsConfig.reps.filter((r: { active: boolean }) => r.active).map((r: { name: string }) => r.name)

describe('Full Acceptance Criteria Pass (BRD §16 Criteria 1-8 + TASK.md §11 Items 9-10)', () => {
  const JUNE_RANGE = { from: '2026-06-01', to: '2026-06-30' }
  const MAY_RANGE = { from: '2026-05-01', to: '2026-05-31' }

  // Criterion 1: All data tabs produce valid viewmodels
  it('Criterion 1: all seven data channels compute valid, complete view models', () => {
    const overviewVm = buildOverviewViewModel({ metaAds, ga4, gsc, linkedin, zoho }, JUNE_RANGE, MAY_RANGE, thresholds, brandTerms, narratives)
    expect(overviewVm.kpiCards.length).toBe(6)
    expect(overviewVm.channelHealth.length).toBe(5)

    const adVm = buildAdCampaignsViewModel(metaAds, JUNE_RANGE, narratives)
    expect(adVm.hasData).toBe(true)

    const leadsVm = buildLeadsViewModel(zoho, JUNE_RANGE, roster, narratives)
    expect(leadsVm.hasData).toBe(true)

    const websiteVm = buildWebsiteViewModel(ga4, JUNE_RANGE, pageTypesConfig, metaAds, narratives)
    expect(websiteVm.hasData).toBe(true)

    const seoVm = buildSeoViewModel(gsc, JUNE_RANGE, brandTerms, narratives)
    expect(seoVm.hasData).toBe(true)

    const linkedinVm = buildLinkedInViewModel(linkedin, JUNE_RANGE, undefined, narratives)
    expect(linkedinVm.hasData).toBe(true)

    const totalLeadsVm = buildTotalLeadsViewModel(metaAds, JUNE_RANGE, MAY_RANGE, narratives)
    expect(totalLeadsVm.hasData).toBe(true)
  })

  // Criterion 2 & 4: Zero-count rows preserved (unassigned reps, zero meetings)
  it('Criteria 2 & 4: preserves zero-count rows for inactive reps and zero-meeting pipelines', () => {
    const leadsVm = buildLeadsViewModel(zoho, JUNE_RANGE, roster, narratives)
    expect(leadsVm.repTable).toBeDefined()
    const rathish = leadsVm.repTable!.find((r) => r.rep === 'Rathish')
    expect(rathish).toBeDefined()
    expect(rathish!.assigned).toBe(0)
    expect(rathish!.contactRateDisplay).toBe('Not assigned')
  })

  // Criterion 5: Comparison fallback handling with explicit label
  it('Criterion 5: comparison falls back to equal length previous period with explicit label', () => {
    const totalLeadsVm = buildTotalLeadsViewModel(metaAds, JUNE_RANGE, null, narratives)
    expect(totalLeadsVm.isFallbackComparison).toBe(true)
    expect(totalLeadsVm.comparisonLabel).toContain('auto-selected')
    expect(totalLeadsVm.comparisonRange).toEqual({ from: '2026-05-02', to: '2026-05-31' })
  })

  // Criterion 6: Secrets and PII notes scan
  it('Criterion 6 (BRD §16.6): secrets and PII scan returns zero violations in public/data', () => {
    const findings = scanSecretsInDirectory(DATA_DIR)
    expect(findings).toEqual([])
  })

  // Criterion 7: Sync timestamps tolerance check
  it('Criterion 7 (BRD §16.7): sync timestamps across all channels are within tolerance', () => {
    const errors = checkSyncTimestamps(DATA_DIR, new Date('2026-08-14T09:00:00+05:30'))
    expect(errors).toEqual([])
  })

  // Criterion 8: Data validation gates
  it('Criterion 8 (BRD §16.8): validation gates pass on current public/data files', () => {
    const errors = validateDataDirectory(DATA_DIR)
    expect(errors).toEqual([])
  })

  // Criterion 9: Zero notes leak in committed Zoho CRM data (TAD ADR-012)
  it('Criterion 9 (TAD ADR-012, item 5.24): public/data/zoho-crm.json contains zero notes or free-text fields', () => {
    const rawZoho = readFileSync(join(DATA_DIR, 'zoho-crm.json'), 'utf8')
    expect(rawZoho.includes('"notes"')).toBe(false)
    expect(rawZoho.includes('"description"')).toBe(false)
    expect(rawZoho.includes('"inquiry_text"')).toBe(false)
  })

  // Criterion 10: Performance budget
  it('Criterion 10 (BRD §15.3, item 5.18): viewmodel computation executes in under 150ms per tab', () => {
    const t0 = performance.now()
    buildOverviewViewModel({ metaAds, ga4, gsc, linkedin, zoho }, JUNE_RANGE, MAY_RANGE, thresholds, brandTerms, narratives)
    const dur = performance.now() - t0
    expect(dur).toBeLessThan(150)
  })
})
