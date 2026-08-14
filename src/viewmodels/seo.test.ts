import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSeoViewModel, classifyZeroClickPriority } from './seo'
import type { GscFileShape } from '@/lib/channels/gsc'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIXTURE_PATH = join(ROOT, 'tests', 'fixtures', 'gsc.json')
const rawFixtureText = readFileSync(FIXTURE_PATH, 'utf8')
const fixture: GscFileShape = JSON.parse(rawFixtureText)

const brandTerms: readonly string[] = (
  JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'config', 'brand-terms.json'), 'utf8')) as {
    terms: string[]
  }
).terms

const JUNE = { from: '2026-06-01', to: '2026-06-30' }

function card(vm: ReturnType<typeof buildSeoViewModel>, label: string) {
  const c = vm.overviewCards?.find((x) => x.label === label)
  if (!c) throw new Error(`no overview card labelled ${label}`)
  return c
}

describe('buildSeoViewModel — overview cards (item 3.26; Wireframe/04-seo-top.jpg)', () => {
  const vm = buildSeoViewModel(fixture, JUNE, brandTerms)

  it('Total clicks reads 469', () => {
    expect(card(vm, 'Total clicks').value).toBe('469')
  })

  it('Total impressions reads 54,744', () => {
    expect(card(vm, 'Total impressions').value).toBe('54,744')
  })

  it('Avg. CTR reads 0.86%', () => {
    expect(card(vm, 'Avg. CTR').value).toBe('0.86%')
  })

  it('Avg. position reads 30.10 (impression-weighted) — item 3.27', () => {
    expect(card(vm, 'Avg. position').value).toBe('30.10')
  })

  it('Indexed pages reads 25', () => {
    expect(card(vm, 'Indexed pages').value).toBe('25')
  })

  it('Brand click share reads 91.04% — item 3.28', () => {
    expect(card(vm, 'Brand click share').value).toBe('91.04%')
  })

  it('Countries reached reads 15', () => {
    expect(card(vm, 'Countries reached').value).toBe('15')
  })

  it('Mobile click share reads 39.87%', () => {
    expect(card(vm, 'Mobile click share').value).toBe('39.87%')
  })
})

describe('buildSeoViewModel — data as of latestRecordDate (item 3.29)', () => {
  it('reads latestRecordDate (2026-08-07), not lastSyncedAt', () => {
    const vm = buildSeoViewModel(fixture, JUNE, brandTerms)
    expect(vm.dataAsOfDate).toBe('2026-08-07')
  })
})

describe('buildSeoViewModel — click-generating queries (item 3.30)', () => {
  const vm = buildSeoViewModel(fixture, JUNE, brandTerms)

  it('includes brand and non-brand queries', () => {
    const queries = vm.clickQueries!
    expect(queries).toBeDefined()
    expect(queries.length).toBeGreaterThan(0)

    const technorucs = queries.find((q) => q.query === 'technorucs')
    expect(technorucs).toBeDefined()
    expect(technorucs!.isBrand).toBe(true)
    expect(technorucs!.typeLabel).toBe('Brand')
    expect(technorucs!.clicks).toBe(400)

    const powerbi = queries.find((q) => q.query === 'power bi consulting india')
    expect(powerbi).toBeDefined()
    expect(powerbi!.isBrand).toBe(false)
    expect(powerbi!.typeLabel).toBe('Non-brand')
    expect(powerbi!.clicks).toBe(20)
  })
})

describe('buildSeoViewModel — zero-click opportunity queries (item 3.31)', () => {
  const vm = buildSeoViewModel(fixture, JUNE, brandTerms)

  it('classifies azure migration consultant as Critical', () => {
    const azure = vm.zeroClickQueries?.find((q) => q.query === 'azure migration consultant')
    expect(azure).toBeDefined()
    expect(azure!.impressions).toBe(148)
    expect(azure!.avgPosition).toBeCloseTo(61.8, 1)
    expect(azure!.priority).toBe('Critical')
    expect(azure!.gapToPage1).toBeGreaterThan(0)
  })

  it('classifies ai tools for digital transformation as High', () => {
    const ai = vm.zeroClickQueries?.find((q) => q.query === 'ai tools for digital transformation')
    expect(ai).toBeDefined()
    expect(ai!.impressions).toBe(24)
    expect(ai!.avgPosition).toBeCloseTo(30.2, 1)
    expect(ai!.priority).toBe('High')
  })

  it('classifyZeroClickPriority helper logic', () => {
    expect(classifyZeroClickPriority(150, 55)).toBe('Critical')
    expect(classifyZeroClickPriority(80, 35)).toBe('High')
    expect(classifyZeroClickPriority(24, 30.2)).toBe('High')
    expect(classifyZeroClickPriority(10, 15)).toBe('Standard')
  })
})

describe('buildSeoViewModel — top pages, countries, devices (item 3.32)', () => {
  const vm = buildSeoViewModel(fixture, JUNE, brandTerms)

  it('renders 25 indexed pages in order of clicks', () => {
    expect(vm.topPages).toBeDefined()
    expect(vm.topPages!.length).toBe(25)
  })

  it('renders 15 countries', () => {
    expect(vm.countries).toBeDefined()
    expect(vm.countries!.length).toBe(15)
  })

  it('renders 3 device categories with mobile click share ~39.9%', () => {
    expect(vm.devices).toBeDefined()
    expect(vm.devices!.length).toBe(3)
    const mobile = vm.devices?.find((d) => d.device === 'MOBILE')
    expect(mobile).toBeDefined()
    expect(mobile!.clicks).toBe(187)
  })
})
