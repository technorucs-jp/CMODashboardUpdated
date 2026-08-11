import {
  ga4FileSchema,
  gscFileSchema,
  linkedInFileSchema,
  metaAdsFileSchema,
  narrativesFileSchema,
  zohoCrmFileSchema,
  type Ga4File,
  type GscFile,
  type LinkedInFile,
  type MetaAdsFile,
  type NarrativesFile,
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
