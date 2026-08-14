import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildWebsiteViewModel, pageTypeFor, type PageTypesConfig } from './website'
import { ga4FileSchema } from '@/data/schemas'
import type { Ga4FileShape } from '@/lib/channels/ga4'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIXTURE_PATH = join(ROOT, 'tests', 'fixtures', 'ga4.json')
const rawFixtureText = readFileSync(FIXTURE_PATH, 'utf8')
const fixture: Ga4FileShape = JSON.parse(rawFixtureText)

const pageTypesConfig: PageTypesConfig = JSON.parse(
  readFileSync(join(ROOT, 'public', 'data', 'config', 'page-types.json'), 'utf8'),
)

const JUNE = { from: '2026-06-01', to: '2026-06-30' }
const SINGLE_DAY = { from: '2026-06-15', to: '2026-06-15' }

function card(vm: ReturnType<typeof buildWebsiteViewModel>, label: string) {
  const c = vm.overviewCards?.find((x) => x.label === label)
  if (!c) throw new Error(`no overview card labelled ${label}`)
  return c
}

describe('pageTypeFor — longest prefix matching (item 3.23)', () => {
  it('maps /careers/ to Talent', () => {
    expect(pageTypeFor('/careers/', pageTypesConfig)).toBe('Talent')
  })

  it('maps /solutions/power-bi-consulting/ to Service', () => {
    expect(pageTypeFor('/solutions/power-bi-consulting/', pageTypesConfig)).toBe('Service')
  })

  it('maps /services/full-stack-development/ to Service', () => {
    expect(pageTypeFor('/services/full-stack-development/', pageTypesConfig)).toBe('Service')
  })

  it('maps /contact-us/ to Conversion', () => {
    expect(pageTypeFor('/contact-us/', pageTypesConfig)).toBe('Conversion')
  })

  it('maps /blog/outsystems-vs-power-apps/ to Blog', () => {
    expect(pageTypeFor('/blog/outsystems-vs-power-apps/', pageTypesConfig)).toBe('Blog')
  })

  it('maps /about-us/ to About', () => {
    expect(pageTypeFor('/about-us/', pageTypesConfig)).toBe('About')
  })

  it('maps /clients/ to Trust', () => {
    expect(pageTypeFor('/clients/', pageTypesConfig)).toBe('Trust')
  })

  it('falls back to default Landing for unmapped paths', () => {
    expect(pageTypeFor('/', pageTypesConfig)).toBe('Landing')
    expect(pageTypeFor('/unknown-page', pageTypesConfig)).toBe('Landing')
  })
})

describe('buildWebsiteViewModel — overview cards (items 3.17, 3.18; Wireframe/03-website-top.jpg)', () => {
  const vm = buildWebsiteViewModel(fixture, JUNE, pageTypesConfig)

  it('totalUsers is "n/a for multi-day ranges" for a multi-day range (item 3.18, P1)', () => {
    expect(card(vm, 'Total users').value).toBe('n/a for multi-day ranges')
    expect(card(vm, 'Total users').detail).toContain('de-duplicated')
  })

  it('totalUsers is rendered for a single-day range (item 3.18)', () => {
    const singleVm = buildWebsiteViewModel(fixture, SINGLE_DAY, pageTypesConfig)
    expect(card(singleVm, 'Total users').value).not.toBe('n/a for multi-day ranges')
  })

  it('Sessions reads 1,720', () => {
    expect(card(vm, 'Sessions').value).toBe('1,720')
  })

  it('Page views reads 2,513', () => {
    expect(card(vm, 'Page views').value).toBe('2,513')
  })

  it('Engaged sessions reads 1,123 with engagement rate in detail', () => {
    expect(card(vm, 'Engaged sessions').value).toBe('1,123')
    expect(card(vm, 'Engaged sessions').detail).toContain('65.29%')
  })

  it('Avg. bounce rate reads 34.71%', () => {
    expect(card(vm, 'Avg. bounce rate').value).toBe('34.71%')
  })

  it('Avg. session duration reads 107s (184,040s ÷ 1,720 sessions)', () => {
    expect(card(vm, 'Avg. session duration').value).toBe('107s')
  })

  it('Pages / session reads 1.46', () => {
    expect(card(vm, 'Pages / session').value).toBe('1.46')
  })

  it('Countries reached reads 71', () => {
    expect(card(vm, 'Countries reached').value).toBe('71')
  })
})

describe('buildWebsiteViewModel — daily sessions (item 3.19)', () => {
  const vm = buildWebsiteViewModel(fixture, JUNE, pageTypesConfig)

  it('contains 30 daily points for June', () => {
    expect(vm.dailySessions).toHaveLength(30)
    expect(vm.dailySessions?.[0]?.date).toBe('2026-06-01')
    expect(vm.dailySessions?.[29]?.date).toBe('2026-06-30')
  })
})

describe('buildWebsiteViewModel — channel breakdown (item 3.20)', () => {
  const vm = buildWebsiteViewModel(fixture, JUNE, pageTypesConfig)

  it('channel breakdown matches June wireframe', () => {
    const channels = vm.channelBreakdown!
    expect(channels).toBeDefined()
    expect(channels.length).toBeGreaterThanOrEqual(5)

    const organicSearch = channels.find((c) => c.channelGroup === 'Organic Search')
    expect(organicSearch).toBeDefined()
    expect(organicSearch!.sessions).toBe(929)
    expect(organicSearch!.shareDisplay).toBe('54.01%')

    const direct = channels.find((c) => c.channelGroup === 'Direct')
    expect(direct).toBeDefined()
    expect(direct!.sessions).toBe(692)
    expect(direct!.shareDisplay).toBe('40.23%')

    const organicSocial = channels.find((c) => c.channelGroup === 'Organic Social')
    expect(organicSocial).toBeDefined()
    expect(organicSocial!.sessions).toBe(62)
    expect(organicSocial!.shareDisplay).toBe('3.60%')

    const referral = channels.find((c) => c.channelGroup === 'Referral')
    expect(referral).toBeDefined()
    expect(referral!.sessions).toBe(23)
    expect(referral!.shareDisplay).toBe('1.34%')

    const ai = channels.find((c) => c.channelGroup === 'AI Assistant')
    expect(ai).toBeDefined()
    expect(ai!.sessions).toBe(5)
    expect(ai!.shareDisplay).toBe('0.29%')
  })
})

describe('buildWebsiteViewModel — AI referral panel (item 3.22)', () => {
  const vm = buildWebsiteViewModel(fixture, JUNE, pageTypesConfig)

  it('reads 5 AI sessions, 80% engagement rate, 20% bounce rate', () => {
    const ai = vm.aiReferral
    expect(ai).toBeDefined()
    expect(ai!.sessions).toBe(5)
    expect(ai!.sessionsDisplay).toBe('5')
    expect(ai!.engagementRateDisplay).toBe('80.00%')
    expect(ai!.bounceRateDisplay).toBe('20.00%')
    expect(ai!.sources.length).toBeGreaterThan(0)
  })
})

describe('buildWebsiteViewModel — top pages (item 3.23)', () => {
  const vm = buildWebsiteViewModel(fixture, JUNE, pageTypesConfig)

  it('tags each page with its config page type', () => {
    const pages = vm.topPages!
    expect(pages).toBeDefined()
    expect(pages.length).toBeGreaterThan(0)

    const careers = pages.find((p) => p.pagePath === '/careers/')
    expect(careers).toBeDefined()
    expect(careers!.pageType).toBe('Talent')
    expect(careers!.views).toBe(303)

    const pbi = pages.find((p) => p.pagePath === '/solutions/power-bi-consulting/')
    expect(pbi).toBeDefined()
    expect(pbi!.pageType).toBe('Service')

    const contact = pages.find((p) => p.pagePath === '/contact-us/')
    expect(contact).toBeDefined()
    expect(contact!.pageType).toBe('Conversion')
  })
})

describe('buildWebsiteViewModel — landing pages, countries, devices (item 3.24)', () => {
  const vm = buildWebsiteViewModel(fixture, JUNE, pageTypesConfig)

  it('landing pages breakdown includes homepage and blog posts', () => {
    const lp = vm.landingPages!
    expect(lp).toBeDefined()
    expect(lp.length).toBeGreaterThan(0)
    expect(lp[0].landingPage).toBe('/')
    expect(lp[0].sessions).toBe(760)
  })

  it('country engagement table contains 71 countries with India and US leading', () => {
    const countries = vm.countries!
    expect(countries).toBeDefined()
    expect(countries.length).toBe(71)
    expect(countries[0].country).toBe('IN')
    expect(countries[0].users).toBe(629)
    expect(countries[1].country).toBe('US')
    expect(countries[1].users).toBe(368)
  })

  it('device split includes desktop and mobile', () => {
    const devices = vm.devices!
    expect(devices).toBeDefined()
    expect(devices).toHaveLength(2)

    const desktop = devices.find((d) => d.device === 'desktop')
    expect(desktop).toBeDefined()
    expect(desktop!.sessions).toBe(1349)

    const mobile = devices.find((d) => d.device === 'mobile')
    expect(mobile).toBeDefined()
    expect(mobile!.sessions).toBe(378)
  })
})

describe('buildWebsiteViewModel — user journey paths (item 3.25)', () => {
  const vm = buildWebsiteViewModel(fixture, JUNE, pageTypesConfig)

  it('renders paths from ga4.paths[]', () => {
    const paths = vm.paths!
    expect(paths).toBeDefined()
    expect(paths.length).toBeGreaterThan(0)
    expect(paths.some((p) => p.step1 === '/' && p.step2 === '/contact-us/')).toBe(true)
  })

  it('schema validity against ga4.json fixture', () => {
    const parsed = ga4FileSchema.safeParse(fixture)
    expect(parsed.success).toBe(true)
  })
})
