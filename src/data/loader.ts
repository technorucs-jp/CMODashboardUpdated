import {
  brandTermsConfigSchema,
  ga4FileSchema,
  gscFileSchema,
  linkedInFileSchema,
  metaAdsFileSchema,
  narrativesFileSchema,
  salesRepsConfigSchema,
  thresholdsConfigSchema,
  zohoCrmFileSchema,
  type BrandTermsConfigFile,
  type Ga4File,
  type GscFile,
  type LinkedInFile,
  type MetaAdsFile,
  type NarrativesFile,
  type SalesRepsConfigFile,
  type ThresholdsConfigFile,
  type ZohoCrmFile,
} from './schemas'

/**
 * `load(channel)` — fetch → Zod parse → in-memory cache, for the browser
 * session (TAD §0.7). Replaces the pre-pivot server loader's `fs.readFile`;
 * the cache now lives for the page's lifetime instead of a server instance,
 * which is the right lifetime here since `staleTime: Infinity` elsewhere
 * already assumes a deployment's data never changes underneath a loaded page
 * (TAD ADR-014). Isolates failure to one channel — a corrupt `gsc.json`
 * throws a typed `ChannelLoadError` without affecting any other channel's load.
 */

const CHANNEL_SCHEMAS = {
  'meta-ads': metaAdsFileSchema,
  'zoho-crm': zohoCrmFileSchema,
  ga4: ga4FileSchema,
  gsc: gscFileSchema,
  linkedin: linkedInFileSchema,
  narratives: narrativesFileSchema,
} as const

export type ChannelName = keyof typeof CHANNEL_SCHEMAS

export interface ChannelFileMap {
  'meta-ads': MetaAdsFile
  'zoho-crm': ZohoCrmFile
  ga4: Ga4File
  gsc: GscFile
  linkedin: LinkedInFile
  narratives: NarrativesFile
}

export class ChannelLoadError extends Error {
  readonly channel: ChannelName

  constructor(channel: ChannelName, message: string, cause?: unknown) {
    super(`[${channel}] ${message}`, cause !== undefined ? { cause } : undefined)
    this.name = 'ChannelLoadError'
    this.channel = channel
  }
}

const cache = new Map<ChannelName, unknown>()
const inflight = new Map<ChannelName, Promise<unknown>>()

/** Where the fetch layer reads from — respects Vite's configured base path (item 0.7's public/data/). */
function dataUrl(channel: ChannelName): string {
  const base = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.BASE_URL : '/'
  return `${base}data/${channel}.json`
}

export async function load<C extends ChannelName>(channel: C): Promise<ChannelFileMap[C]> {
  if (cache.has(channel)) {
    return cache.get(channel) as ChannelFileMap[C]
  }
  if (inflight.has(channel)) {
    return inflight.get(channel) as Promise<ChannelFileMap[C]>
  }

  const promise = (async () => {
    let response: Response
    try {
      response = await fetch(dataUrl(channel))
    } catch (err) {
      throw new ChannelLoadError(channel, `network error fetching ${channel}.json`, err)
    }

    if (!response.ok) {
      throw new ChannelLoadError(channel, `fetching ${channel}.json returned HTTP ${response.status}`)
    }

    let json: unknown
    try {
      json = await response.json()
    } catch (err) {
      throw new ChannelLoadError(channel, `${channel}.json is not valid JSON`, err)
    }

    const schema = CHANNEL_SCHEMAS[channel]
    const result = schema.safeParse(json)
    if (!result.success) {
      throw new ChannelLoadError(channel, `failed schema validation: ${result.error.message}`, result.error)
    }

    cache.set(channel, result.data)
    return result.data
  })()

  inflight.set(channel, promise)
  try {
    return (await promise) as ChannelFileMap[C]
  } finally {
    inflight.delete(channel)
  }
}

/** Test-only escape hatch — clears the module-level cache between test cases. */
export function clearLoaderCacheForTests(): void {
  cache.clear()
  inflight.clear()
}

/**
 * `loadConfig(name)` — the equivalent of `load()` for `public/data/config/*.json`
 * (thresholds, brand terms, page types, etc.), item 3.28/1.18's "tune at render
 * time, no re-sync" requirement. Kept as a sibling function rather than folded
 * into `load()`/`CHANNEL_SCHEMAS` — config files are hand-edited, loosely
 * schema'd, and live under a different URL segment (`config/`), not a fourth
 * shape that would otherwise need shoehorning into the channel-file cache.
 */
const CONFIG_SCHEMAS = {
  thresholds: thresholdsConfigSchema,
  'brand-terms': brandTermsConfigSchema,
  'sales-reps': salesRepsConfigSchema,
} as const

export type ConfigName = keyof typeof CONFIG_SCHEMAS

export interface ConfigFileMap {
  thresholds: ThresholdsConfigFile
  'brand-terms': BrandTermsConfigFile
  'sales-reps': SalesRepsConfigFile
}

export class ConfigLoadError extends Error {
  readonly config: ConfigName

  constructor(config: ConfigName, message: string, cause?: unknown) {
    super(`[config/${config}] ${message}`, cause !== undefined ? { cause } : undefined)
    this.name = 'ConfigLoadError'
    this.config = config
  }
}

const configCache = new Map<ConfigName, unknown>()
const configInflight = new Map<ConfigName, Promise<unknown>>()

function configUrl(name: ConfigName): string {
  const base = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.BASE_URL : '/'
  return `${base}data/config/${name}.json`
}

export async function loadConfig<C extends ConfigName>(name: C): Promise<ConfigFileMap[C]> {
  if (configCache.has(name)) {
    return configCache.get(name) as ConfigFileMap[C]
  }
  if (configInflight.has(name)) {
    return configInflight.get(name) as Promise<ConfigFileMap[C]>
  }

  const promise = (async () => {
    let response: Response
    try {
      response = await fetch(configUrl(name))
    } catch (err) {
      throw new ConfigLoadError(name, `network error fetching config/${name}.json`, err)
    }

    if (!response.ok) {
      throw new ConfigLoadError(name, `fetching config/${name}.json returned HTTP ${response.status}`)
    }

    let json: unknown
    try {
      json = await response.json()
    } catch (err) {
      throw new ConfigLoadError(name, `config/${name}.json is not valid JSON`, err)
    }

    const schema = CONFIG_SCHEMAS[name]
    const result = schema.safeParse(json)
    if (!result.success) {
      throw new ConfigLoadError(name, `failed schema validation: ${result.error.message}`, result.error)
    }

    configCache.set(name, result.data)
    return result.data
  })()

  configInflight.set(name, promise)
  try {
    return (await promise) as ConfigFileMap[C]
  } finally {
    configInflight.delete(name)
  }
}

/** Test-only escape hatch — clears the config cache between test cases. */
export function clearConfigCacheForTests(): void {
  configCache.clear()
  configInflight.clear()
}
