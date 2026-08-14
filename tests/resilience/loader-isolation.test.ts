import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSeoViewModel } from '../../src/viewmodels/seo'
import { buildAdCampaignsViewModel } from '../../src/viewmodels/adCampaigns'
import { buildLeadsViewModel } from '../../src/viewmodels/leads'
import { buildOverviewViewModel } from '../../src/viewmodels/overview'
import type { GscFileShape } from '../../src/lib/channels/gsc'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIXTURES_DIR = join(ROOT, 'tests', 'fixtures')
const CONFIG_DIR = join(ROOT, 'public', 'data', 'config')

const metaAdsFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'meta-ads.json'), 'utf8'))
const ga4File = JSON.parse(readFileSync(join(FIXTURES_DIR, 'ga4.json'), 'utf8'))
const linkedinFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'linkedin.json'), 'utf8'))
const zohoFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'zoho-crm.json'), 'utf8'))

const thresholds = JSON.parse(readFileSync(join(CONFIG_DIR, 'thresholds.json'), 'utf8'))
const brandTerms = JSON.parse(readFileSync(join(CONFIG_DIR, 'brand-terms.json'), 'utf8')).terms
const repsConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'sales-reps.json'), 'utf8'))
const roster = repsConfig.reps.filter((r: { active: boolean }) => r.active).map((r: { name: string }) => r.name)

describe('Loader Failure Isolation (item 5.16; TAD §11)', () => {
  const range = { from: '2026-06-01', to: '2026-06-30' }
  const corruptGscFile = { schemaVersion: 1, meta: { earliestRecordDate: '2026-01-01', latestRecordDate: '2026-01-02' }, rows: [] }

  it('one corrupt channel file (GSC) degrades SEO only while other channels remain fully functional', () => {
    // 1. SEO with corrupt file reports no data or coverage gap
    const seoVm = buildSeoViewModel(corruptGscFile as unknown as GscFileShape, range, brandTerms, null)
    expect(seoVm.hasData).toBe(false)
    expect(seoVm.overviewCards).toBeNull()

    // 2. Meta Ads remains 100% functional
    const adVm = buildAdCampaignsViewModel(metaAdsFile, range, null)
    expect(adVm.hasData).toBe(true)
    expect(adVm.accountCards).toBeDefined()
    expect(adVm.accountCards?.spend).toBe('₹38,423.31')

    // 3. Leads remains 100% functional
    const leadsVm = buildLeadsViewModel(zohoFile, range, roster, null)
    expect(leadsVm.hasData).toBe(true)
    expect(leadsVm.overviewCards).toBeDefined()
    expect(leadsVm.overviewCards![0]?.value).toBe('49')

    // 4. Overview degrades gracefully for GSC while keeping Meta/GA4/Zoho cards
    const overviewVm = buildOverviewViewModel(
      { metaAds: metaAdsFile, ga4: ga4File, gsc: corruptGscFile as unknown as GscFileShape, linkedin: linkedinFile, zoho: zohoFile },
      range,
      null,
      thresholds,
      brandTerms,
      null,
    )
    expect(overviewVm.kpiCards.length).toBeGreaterThan(0)
    // Non-GSC KPI cards like Meta spend still compute accurately
    const spendCard = overviewVm.kpiCards.find((c) => c.label.includes('Ad spend') || c.label.includes('Spend'))
    expect(spendCard).toBeDefined()
  })
})
