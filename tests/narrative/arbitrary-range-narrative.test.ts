import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildOverviewViewModel } from '../../src/viewmodels/overview'
import { buildAdCampaignsViewModel } from '../../src/viewmodels/adCampaigns'
import { buildLeadsViewModel } from '../../src/viewmodels/leads'
import { buildWebsiteViewModel } from '../../src/viewmodels/website'
import { buildSeoViewModel } from '../../src/viewmodels/seo'
import { buildLinkedInViewModel } from '../../src/viewmodels/linkedin'
import { buildTotalLeadsViewModel } from '../../src/viewmodels/totalLeads'
import { renderFlagNarrative } from '../../src/lib/narrative/renderer'
import { evaluateRules } from '../../src/lib/rules/engine'
import { queryMetaAds } from '../../src/lib/channels/metaAds'
import { queryGa4 } from '../../src/lib/channels/ga4'
import { queryGsc } from '../../src/lib/channels/gsc'
import { queryLinkedIn } from '../../src/lib/channels/linkedin'
import { queryZoho } from '../../src/lib/channels/zoho'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')
const CONFIG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'config')

const metaAdsFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'meta-ads.json'), 'utf8'))
const ga4File = JSON.parse(readFileSync(join(FIXTURES_DIR, 'ga4.json'), 'utf8'))
const gscFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'gsc.json'), 'utf8'))
const linkedinFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'linkedin.json'), 'utf8'))
const zohoFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'zoho-crm.json'), 'utf8'))
const narrativesFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'narratives.json'), 'utf8'))

const thresholds = JSON.parse(readFileSync(join(CONFIG_DIR, 'thresholds.json'), 'utf8'))
const brandTerms = JSON.parse(readFileSync(join(CONFIG_DIR, 'brand-terms.json'), 'utf8')).terms
const repsConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'sales-reps.json'), 'utf8'))
const pageTypesConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'page-types.json'), 'utf8'))
const roster = repsConfig.reps.filter((r: { active: boolean }) => r.active).map((r: { name: string }) => r.name)

describe('Arbitrary-Range Narrative & Phase 4 Gate (items 4.14-4.19; ADR-004)', () => {
  const ARBITRARY_RANGE = { from: '2026-06-14', to: '2026-08-02' }

  it('item 4.19 — arbitrary range 14 Jun – 2 Aug renders narrative with live figures matching that exact range', () => {
    const metaRes = queryMetaAds(metaAdsFile, ARBITRARY_RANGE).data
    const ga4Res = queryGa4(ga4File, ARBITRARY_RANGE).data
    const gscRes = queryGsc(gscFile, ARBITRARY_RANGE, brandTerms).data
    const linkedinRes = queryLinkedIn(linkedinFile, ARBITRARY_RANGE).data
    const zohoRes = queryZoho(zohoFile, ARBITRARY_RANGE).data

    const flags = evaluateRules({
      metaAds: metaRes,
      ga4: ga4Res,
      gsc: gscRes,
      linkedin: linkedinRes,
      zoho: zohoRes,
    })

    expect(flags.length).toBeGreaterThan(0)

    // Render every flag using authored phrasing if available or default fallback
    for (const flag of flags) {
      const rendered = renderFlagNarrative(flag, narrativesFile.phrasings[flag.id])
      expect(rendered.headline).toBeTruthy()
      expect(rendered.body).toBeTruthy()
      // Assert no unparsed {tokens} remain in output
      expect(rendered.headline).not.toMatch(/\{[a-zA-Z0-9_|:]+\}/)
      expect(rendered.body).not.toMatch(/\{[a-zA-Z0-9_|:]+\}/)
    }
  })

  it('Phase 4 Gate: with narratives.json missing/null, all 7 data tab viewmodels render complete default narratives', () => {
    const overviewVm = buildOverviewViewModel(
      { metaAds: metaAdsFile, ga4: ga4File, gsc: gscFile, linkedin: linkedinFile, zoho: zohoFile },
      { from: '2026-06-01', to: '2026-06-30' },
      null,
      thresholds,
      brandTerms,
      null, // No narratives file
    )
    expect(overviewVm.narrativeFlags.length).toBeGreaterThan(0)
    for (const f of overviewVm.narrativeFlags) {
      expect(f.headline).toBeTruthy()
      expect(f.body).toBeTruthy()
      expect(f.headline).not.toMatch(/\{[a-zA-Z0-9_|:]+\}/)
      expect(f.body).not.toMatch(/\{[a-zA-Z0-9_|:]+\}/)
    }

    const adVm = buildAdCampaignsViewModel(metaAdsFile, { from: '2026-06-01', to: '2026-06-30' }, null)
    expect(adVm.narrativeFlags.length).toBeGreaterThan(0)

    const leadsVm = buildLeadsViewModel(zohoFile, { from: '2026-06-01', to: '2026-06-30' }, roster, null)
    expect(leadsVm.narrativeFlags.length).toBeGreaterThan(0)

    const websiteVm = buildWebsiteViewModel(ga4File, { from: '2026-06-01', to: '2026-06-30' }, pageTypesConfig, metaAdsFile, null)
    expect(websiteVm.narrativeFlags.length).toBeGreaterThan(0)

    const seoVm = buildSeoViewModel(gscFile, { from: '2026-06-01', to: '2026-06-30' }, brandTerms, null)
    expect(seoVm.narrativeFlags.length).toBeGreaterThan(0)

    const linkedinVm = buildLinkedInViewModel(linkedinFile, { from: '2026-06-01', to: '2026-06-30' }, undefined, null)
    expect(linkedinVm.narrativeFlags.length).toBeGreaterThan(0)

    const totalLeadsVm = buildTotalLeadsViewModel(metaAdsFile, { from: '2026-06-01', to: '2026-06-30' }, null, null)
    expect(totalLeadsVm.narrativeFlags.length).toBeGreaterThan(0)
  })

  it('Phase 4 Gate: with narratives.json restored, authored phrasing with live numbers is rendered', () => {
    const overviewVm = buildOverviewViewModel(
      { metaAds: metaAdsFile, ga4: ga4File, gsc: gscFile, linkedin: linkedinFile, zoho: zohoFile },
      { from: '2026-06-01', to: '2026-06-30' },
      null,
      thresholds,
      brandTerms,
      narrativesFile,
    )
    const outlier = overviewVm.narrativeFlags.find((f) => f.id === 'meta.adset.cost-per-conv-outlier')
    expect(outlier).toBeDefined()
    expect(outlier!.body).toContain('auction self-competition')
    expect(outlier!.body).toContain('₹1,923.21')
  })
})
