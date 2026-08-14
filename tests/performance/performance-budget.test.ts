import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOverviewViewModel } from '../../src/viewmodels/overview'
import { buildAdCampaignsViewModel } from '../../src/viewmodels/adCampaigns'
import { buildLeadsViewModel } from '../../src/viewmodels/leads'
import { buildWebsiteViewModel } from '../../src/viewmodels/website'
import { buildSeoViewModel } from '../../src/viewmodels/seo'
import { buildLinkedInViewModel } from '../../src/viewmodels/linkedin'
import { buildTotalLeadsViewModel } from '../../src/viewmodels/totalLeads'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIXTURES_DIR = join(ROOT, 'tests', 'fixtures')
const CONFIG_DIR = join(ROOT, 'public', 'data', 'config')

const metaAdsFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'meta-ads.json'), 'utf8'))
const ga4File = JSON.parse(readFileSync(join(FIXTURES_DIR, 'ga4.json'), 'utf8'))
const gscFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'gsc.json'), 'utf8'))
const linkedinFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'linkedin.json'), 'utf8'))
const zohoFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'zoho-crm.json'), 'utf8'))

const thresholds = JSON.parse(readFileSync(join(CONFIG_DIR, 'thresholds.json'), 'utf8'))
const brandTerms = JSON.parse(readFileSync(join(CONFIG_DIR, 'brand-terms.json'), 'utf8')).terms
const repsConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'sales-reps.json'), 'utf8'))
const pageTypesConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'page-types.json'), 'utf8'))
const roster = repsConfig.reps.filter((r: { active: boolean }) => r.active).map((r: { name: string }) => r.name)

describe('Performance Budget & Latency Ceilings (items 5.17, 5.18; BRD §15.3, TAD §14)', () => {
  const ONE_MONTH_RANGE = { from: '2026-06-01', to: '2026-06-30' }
  const TWELVE_MONTH_RANGE = { from: '2026-05-01', to: '2027-04-30' }

  it('item 5.17 — viewmodel computation time against in-memory data is under 150ms per tab', () => {
    const startMeta = performance.now()
    buildAdCampaignsViewModel(metaAdsFile, ONE_MONTH_RANGE, null)
    const durMeta = performance.now() - startMeta
    expect(durMeta).toBeLessThan(150)

    const startLeads = performance.now()
    buildLeadsViewModel(zohoFile, ONE_MONTH_RANGE, roster, null)
    const durLeads = performance.now() - startLeads
    expect(durLeads).toBeLessThan(150)

    const startWeb = performance.now()
    buildWebsiteViewModel(ga4File, ONE_MONTH_RANGE, pageTypesConfig, metaAdsFile, null)
    const durWeb = performance.now() - startWeb
    expect(durWeb).toBeLessThan(150)

    const startSeo = performance.now()
    buildSeoViewModel(gscFile, ONE_MONTH_RANGE, brandTerms, null)
    const durSeo = performance.now() - startSeo
    expect(durSeo).toBeLessThan(150)

    const startLinkedin = performance.now()
    buildLinkedInViewModel(linkedinFile, ONE_MONTH_RANGE, undefined, null)
    const durLinkedin = performance.now() - startLinkedin
    expect(durLinkedin).toBeLessThan(150)

    const startTotalLeads = performance.now()
    buildTotalLeadsViewModel(metaAdsFile, ONE_MONTH_RANGE, null, null)
    const durTotalLeads = performance.now() - startTotalLeads
    expect(durTotalLeads).toBeLessThan(150)

    const startOverview = performance.now()
    buildOverviewViewModel(
      { metaAds: metaAdsFile, ga4: ga4File, gsc: gscFile, linkedin: linkedinFile, zoho: zohoFile },
      ONE_MONTH_RANGE,
      null,
      thresholds,
      brandTerms,
      null,
    )
    const durOverview = performance.now() - startOverview
    expect(durOverview).toBeLessThan(150)
  })

  it('item 5.18 — 12-month range change aggregation across all channels executes well inside 3.0-second ceiling (BRD §15.3)', () => {
    const t0 = performance.now()

    // Aggregate across all channels for 12 months
    const overviewVm = buildOverviewViewModel(
      { metaAds: metaAdsFile, ga4: ga4File, gsc: gscFile, linkedin: linkedinFile, zoho: zohoFile },
      TWELVE_MONTH_RANGE,
      null,
      thresholds,
      brandTerms,
      null,
    )

    const adVm = buildAdCampaignsViewModel(metaAdsFile, TWELVE_MONTH_RANGE, null)
    const leadsVm = buildLeadsViewModel(zohoFile, TWELVE_MONTH_RANGE, roster, null)
    const webVm = buildWebsiteViewModel(ga4File, TWELVE_MONTH_RANGE, pageTypesConfig, metaAdsFile, null)
    const seoVm = buildSeoViewModel(gscFile, TWELVE_MONTH_RANGE, brandTerms, null)
    const linkedInVm = buildLinkedInViewModel(linkedinFile, TWELVE_MONTH_RANGE, undefined, null)
    const totalLeadsVm = buildTotalLeadsViewModel(metaAdsFile, TWELVE_MONTH_RANGE, null, null)

    const totalDurationMs = performance.now() - t0

    expect(overviewVm).toBeDefined()
    expect(adVm).toBeDefined()
    expect(leadsVm).toBeDefined()
    expect(webVm).toBeDefined()
    expect(seoVm).toBeDefined()
    expect(linkedInVm).toBeDefined()
    expect(totalLeadsVm).toBeDefined()

    // Must be under 3000ms (in practice typically < 100ms)
    expect(totalDurationMs).toBeLessThan(3000)
  })
})
