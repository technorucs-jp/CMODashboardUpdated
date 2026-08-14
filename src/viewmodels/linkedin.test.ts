import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildLinkedInViewModel } from './linkedin'
import type { LinkedInFileShape } from '@/lib/channels/linkedin'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIXTURE_PATH = join(ROOT, 'tests', 'fixtures', 'linkedin.json')
const rawFixtureText = readFileSync(FIXTURE_PATH, 'utf8')
const fixture: LinkedInFileShape = JSON.parse(rawFixtureText)

const JUNE = { from: '2026-06-01', to: '2026-06-30' }
const PARTIAL_RANGE = { from: '2026-06-15', to: '2026-07-15' }

function card(vm: ReturnType<typeof buildLinkedInViewModel>, label: string) {
  const c = vm.overviewCards?.find((x) => x.label === label)
  if (!c) throw new Error(`no overview card labelled ${label}`)
  return c
}

describe('buildLinkedInViewModel — overview cards (item 3.35; Wireframe/06-linkedin-top.jpg)', () => {
  const vm = buildLinkedInViewModel(fixture, JUNE)

  it('New followers reads 132', () => {
    expect(card(vm, 'New followers').value).toBe('132')
  })

  it('Page views reads 2,349', () => {
    expect(card(vm, 'Page views').value).toBe('2,349')
  })

  it('Unique visitors is "n/a for multi-day ranges" for multi-day (P1/TAD §9.2)', () => {
    expect(card(vm, 'Unique visitors').value).toBe('n/a for multi-day ranges')
  })

  it('Impressions reads 16,374', () => {
    expect(card(vm, 'Impressions').value).toBe('16,374')
  })

  it('Clicks reads 2,099', () => {
    expect(card(vm, 'Clicks').value).toBe('2,099')
  })

  it('Reactions reads 522', () => {
    expect(card(vm, 'Reactions').value).toBe('522')
  })

  it('Comments reads 7', () => {
    expect(card(vm, 'Comments').value).toBe('7')
  })

  it('Posts published reads 9 with reactions/post in detail', () => {
    expect(card(vm, 'Posts published').value).toBe('9')
    expect(card(vm, 'Posts published').detail).toContain('58.00 reactions / post')
  })
})

describe('buildLinkedInViewModel — coverage gate (item 3.36, BRD §16 criterion 5)', () => {
  it('suppresses numbers and returns requires-full-coverage for 15 Jun - 15 Jul', () => {
    const vm = buildLinkedInViewModel(fixture, PARTIAL_RANGE)
    expect(vm.hasData).toBe(false)
    expect(vm.coverage.kind).toBe('requires-full-coverage')
    expect(vm.overviewCards).toBeNull()
  })
})

describe('buildLinkedInViewModel — competitor comparison (item 3.37)', () => {
  const vm = buildLinkedInViewModel(fixture, JUNE)

  it('TechnoRUCS is Leading (58.0 reactions/post) and BytesTechnolab is Behind (15.0)', () => {
    const comp = vm.competitorTable!
    expect(comp).toBeDefined()
    expect(comp.length).toBeGreaterThanOrEqual(2)

    const self = comp.find((c) => c.isSelf)
    expect(self).toBeDefined()
    expect(self!.page).toBe('TechnoRUCS')
    expect(self!.newFollowers).toBe(132)
    expect(self!.posts).toBe(9)
    expect(self!.reactions).toBe(522)
    expect(self!.reactionsPerPostDisplay).toBe('58.00')
    expect(self!.verdict).toBe('Leading')

    const competitor = comp.find((c) => !c.isSelf)
    expect(competitor).toBeDefined()
    expect(competitor!.page).toContain('BytesTechnolab')
    expect(competitor!.newFollowers).toBe(15)
    expect(competitor!.posts).toBe(1)
    expect(competitor!.reactions).toBe(15)
    expect(competitor!.reactionsPerPostDisplay).toBe('15.00')
    expect(competitor!.verdict).toBe('Behind')
  })
})

describe('buildLinkedInViewModel — post performance list (item 3.39)', () => {
  const vm = buildLinkedInViewModel(fixture, JUNE)

  it('ranks 9 posts by impressions with Chennai Salesforce Meetup leading', () => {
    const posts = vm.posts!
    expect(posts).toBeDefined()
    expect(posts).toHaveLength(9)

    const topPost = posts[0]
    expect(topPost.title).toContain('Chennai Salesforce')
    expect(topPost.impressions).toBe(3353)
    expect(topPost.clicks).toBe(1385)
    expect(topPost.reactions).toBe(129)
    expect(topPost.engagementRateDisplay).toBe('45.21%')
    expect(topPost.ctrDisplay).toBe('41.31%')
  })
})

describe('buildLinkedInViewModel — audience profile (item 3.40)', () => {
  const vm = buildLinkedInViewModel(fixture, JUNE)

  it('provides seniority, job function, industry, and company size breakdowns', () => {
    const aud = vm.audience!
    expect(aud).toBeDefined()
    expect(aud.seniority.length).toBeGreaterThan(0)
    expect(aud.jobFunction.length).toBeGreaterThan(0)
    expect(aud.visitorIndustry.length).toBeGreaterThan(0)
    expect(aud.companySize.length).toBeGreaterThan(0)

    expect(aud.seniority[0].label).toBe('Senior')
    expect(aud.jobFunction[0].label).toBe('Engineering')
    expect(aud.visitorIndustry[0].label).toBe('IT Services')
  })
})
