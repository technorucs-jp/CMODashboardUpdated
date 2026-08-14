import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from '../../src/lib/metrics/ratio'
import { queryMetaAds, type MetaAdsFileShape } from '../../src/lib/channels/metaAds'
import { queryGa4, type Ga4FileShape } from '../../src/lib/channels/ga4'
import { queryGsc, type GscFileShape } from '../../src/lib/channels/gsc'
import { queryLinkedIn, type LinkedInFileShape } from '../../src/lib/channels/linkedin'
import { queryZoho, type ZohoCrmFileShape } from '../../src/lib/channels/zoho'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8')) as T
}

const MAY = { from: '2026-05-01', to: '2026-05-31' }
const JUNE = { from: '2026-06-01', to: '2026-06-30' }
const JULY = { from: '2026-07-01', to: '2026-07-31' }

describe('Phase 3 Gate Reconciliation — May, June, and July', () => {
  describe('May 2026 Reconciliation', () => {
    it('Meta Ads: returns full coverage with non-zero conversations and spend', () => {
      const result = queryMetaAds(loadFixture<MetaAdsFileShape>('meta-ads'), MAY)
      expect(result.coverage.kind).toBe('full')
      expect(result.data!.summary.conversations).toBe(178)
      expect(result.data!.summary.spend).toBeCloseTo(31374.60, 0)
    })

    it('GA4: returns full coverage and sessions', () => {
      const result = queryGa4(loadFixture<Ga4FileShape>('ga4'), MAY)
      expect(result.coverage.kind).toBe('full')
      expect(result.data!.summary.sessions).toBeGreaterThan(0)
    })

    it('GSC: returns lagging coverage with non-brand clicks observed', () => {
      const result = queryGsc(loadFixture<GscFileShape>('gsc'), MAY, ['technorucs'])
      expect(result.coverage.kind).toBe('lagging')
      expect(result.data!.summary.nonBrandClicks).toBe(215)
    })

    it('Zoho CRM: returns full coverage with leads', () => {
      const result = queryZoho(loadFixture<ZohoCrmFileShape>('zoho-crm'), MAY)
      expect(result.coverage.kind).toBe('full')
      expect(result.data!.summary.totalInbound).toBeGreaterThan(0)
    })
  })

  describe('June 2026 Reconciliation', () => {
    it('reconciles all 5 channels against June goldens', () => {
      const meta = queryMetaAds(loadFixture<MetaAdsFileShape>('meta-ads'), JUNE)
      expect(meta.data!.summary.conversations).toBe(101)
      expect(meta.data!.summary.spend).toBeCloseTo(38423.31, 1)

      const ga4 = queryGa4(loadFixture<Ga4FileShape>('ga4'), JUNE)
      expect(ga4.data!.summary.sessions).toBe(1720)

      const gsc = queryGsc(loadFixture<GscFileShape>('gsc'), JUNE, ['technorucs'])
      expect(gsc.data!.summary.clicks).toBe(469)
      expect(gsc.data!.summary.impressions).toBe(54744)

      const linkedin = queryLinkedIn(loadFixture<LinkedInFileShape>('linkedin'), JUNE)
      expect(linkedin.data!.summary.newFollowers).toBe(132)
      expect(linkedin.data!.summary.reactions).toBe(522)

      const zoho = queryZoho(loadFixture<ZohoCrmFileShape>('zoho-crm'), JUNE)
      expect(zoho.data!.summary.totalInbound).toBe(49)
      expect(resolve(zoho.data!.summary.contactRate)! * 100).toBeCloseTo(30.6, 1)
    })
  })

  describe('July 2026 Reconciliation', () => {
    it('Meta Ads: returns full coverage with active records', () => {
      const result = queryMetaAds(loadFixture<MetaAdsFileShape>('meta-ads'), JULY)
      expect(result.coverage.kind).toBe('full')
      expect(result.data!.summary.conversations).toBeGreaterThan(0)
    })

    it('GA4: returns full coverage', () => {
      const result = queryGa4(loadFixture<Ga4FileShape>('ga4'), JULY)
      expect(result.coverage.kind).toBe('full')
      expect(result.data!.summary.sessions).toBeGreaterThan(0)
    })

    it('GSC: returns lagging coverage', () => {
      const result = queryGsc(loadFixture<GscFileShape>('gsc'), JULY)
      expect(result.coverage.kind).toBe('lagging')
      expect(result.data!.summary.clicks).toBeGreaterThan(0)
    })

    it('Zoho CRM: returns full coverage with active leads', () => {
      const result = queryZoho(loadFixture<ZohoCrmFileShape>('zoho-crm'), JULY)
      expect(result.coverage.kind).toBe('full')
      expect(result.data!.summary.totalInbound).toBeGreaterThan(0)
    })
  })
})
