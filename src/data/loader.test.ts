import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ChannelLoadError, ConfigLoadError, clearConfigCacheForTests, clearLoaderCacheForTests, load, loadConfig } from './loader'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures')
const CONFIG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'config')

function fixtureJson(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8'))
}

function configJson(name: string): unknown {
  return JSON.parse(readFileSync(join(CONFIG_DIR, `${name}.json`), 'utf8'))
}

function mockFetchResponses(bodies: Partial<Record<string, unknown>>) {
  return vi.fn(async (url: string) => {
    const channel = Object.keys(bodies).find((name) => url.includes(`${name}.json`))
    if (channel === undefined) {
      return { ok: false, status: 404, json: async () => ({}) } as Response
    }
    return { ok: true, status: 200, json: async () => bodies[channel] } as Response
  })
}

describe('loader.ts (item 1.21)', () => {
  beforeEach(() => {
    clearLoaderCacheForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads and Zod-parses a well-formed channel file', async () => {
    vi.stubGlobal('fetch', mockFetchResponses({ ga4: fixtureJson('ga4') }))
    const data = await load('ga4')
    expect(data.meta.channel).toBe('ga4')
    expect(Array.isArray(data.daily)).toBe(true)
  })

  it('a corrupt gsc.json makes load("gsc") throw a typed ChannelLoadError, while load("ga4") still succeeds', async () => {
    const corruptGsc = {
      ...(fixtureJson('gsc') as Record<string, unknown>),
      daily: [{ date: '2026-06-01', clicks: 1, impressions: 1, position: 5 }], // `position` — fails the strict schema
    }
    vi.stubGlobal('fetch', mockFetchResponses({ gsc: corruptGsc, ga4: fixtureJson('ga4') }))

    await expect(load('gsc')).rejects.toBeInstanceOf(ChannelLoadError)
    await expect(load('gsc')).rejects.toMatchObject({ channel: 'gsc' })

    const ga4Data = await load('ga4')
    expect(ga4Data.meta.channel).toBe('ga4')
  })

  it('caches per channel — a second load() does not issue a second fetch', async () => {
    const fetchMock = mockFetchResponses({ 'meta-ads': fixtureJson('meta-ads') })
    vi.stubGlobal('fetch', fetchMock)

    await load('meta-ads')
    await load('meta-ads')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws a typed error on a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    await expect(load('linkedin')).rejects.toBeInstanceOf(ChannelLoadError)
  })

  it('throws a typed error on a non-OK HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404 }) as Response),
    )
    await expect(load('zoho-crm')).rejects.toThrow(/HTTP 404/)
  })
})

describe('loadConfig (Overview items 3.2-3.6 — thresholds/brand-terms read at render time)', () => {
  beforeEach(() => {
    clearConfigCacheForTests()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads and Zod-parses the real committed thresholds.json', async () => {
    vi.stubGlobal('fetch', mockFetchResponses({ thresholds: configJson('thresholds') }))
    const data = await loadConfig('thresholds')
    expect(data.leading.favourablePct).toBe(15)
    expect(data.good.withinPct).toBe(5)
  })

  it('loads and Zod-parses the real committed brand-terms.json', async () => {
    vi.stubGlobal('fetch', mockFetchResponses({ 'brand-terms': configJson('brand-terms') }))
    const data = await loadConfig('brand-terms')
    expect(data.terms).toContain('technorucs')
  })

  it('a malformed config file throws a typed ConfigLoadError', async () => {
    vi.stubGlobal('fetch', mockFetchResponses({ thresholds: { schemaVersion: 1 } }))
    await expect(loadConfig('thresholds')).rejects.toBeInstanceOf(ConfigLoadError)
    await expect(loadConfig('thresholds')).rejects.toMatchObject({ config: 'thresholds' })
  })

  it('caches per config name — a second loadConfig() does not issue a second fetch', async () => {
    const fetchMock = mockFetchResponses({ thresholds: configJson('thresholds') })
    vi.stubGlobal('fetch', fetchMock)

    await loadConfig('thresholds')
    await loadConfig('thresholds')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('caches thresholds and brand-terms independently', async () => {
    const fetchMock = mockFetchResponses({ thresholds: configJson('thresholds'), 'brand-terms': configJson('brand-terms') })
    vi.stubGlobal('fetch', fetchMock)

    await loadConfig('thresholds')
    await loadConfig('brand-terms')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
