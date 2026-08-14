import { z } from 'zod'

/**
 * Zod schemas — the runtime parse boundary for every `public/data/*.json` file, and
 * the TypeScript source of truth `/schemas/*.schema.json` is generated from
 * (`npm run schemas:build`, item 1.9). TAD §7.2/§7.4.
 *
 * These are deliberately `.strict()` wherever a channel schema is defined below —
 * an unexpected field failing parse is exactly how P1 ("no ratio is ever stored")
 * and P3′ ("no field the browser has no legitimate reason to see") are enforced
 * mechanically rather than by convention.
 */

// ---------------------------------------------------------------------------
// Common envelope (TAD §7.2)
// ---------------------------------------------------------------------------

export const envelopeMetaSchema = z
  .object({
    channel: z.string(),
    /** ISO 8601 datetime with offset. Never parsed with raw `Date` here — that's P5's job, downstream. */
    lastSyncedAt: z.string(),
    /** 'YYYY-MM-DD' business date. */
    earliestRecordDate: z.string(),
    /** 'YYYY-MM-DD' business date. Distinct from lastSyncedAt — see TAD §7.2 (GSC's 2-3 day lag). */
    latestRecordDate: z.string(),
    syncSource: z.string(),
    coworkRunId: z.string(),
    rowCounts: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict()

export const envelopeSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    meta: envelopeMetaSchema,
  })
  .strict()

export type EnvelopeMeta = z.infer<typeof envelopeMetaSchema>

// ---------------------------------------------------------------------------
// meta-ads.json (TAD §7.3, ADR-009) — dimensions + narrow facts, no stored ratios
// ---------------------------------------------------------------------------

export const metaAdsAdSetSchema = z
  .object({
    adSetId: z.string(),
    adSetName: z.string(),
    campaignId: z.string(),
    campaignName: z.string(),
    launchDate: z.string(),
    region: z.string(),
  })
  .strict()

export const metaAdsFactSchema = z
  .object({
    date: z.string(),
    adSetId: z.string(),
    country: z.string(),
    spend: z.number().nonnegative(),
    impressions: z.number().int().nonnegative(),
    /** Non-additive across days (TAD §9.2) — do not sum for multi-day ranges. */
    reach: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    conversations: z.number().int().nonnegative(),
    // Deliberately NO cpc/cpm/ctr/frequency — every one is a ratio, P1 forbids
    // storing it. A fact row with any of these fails this `.strict()` schema.
  })
  .strict()

export const metaAdsAccountSchema = z
  .object({
    date: z.string(),
    opportunityScore: z.number().min(0).max(100),
    recommendations: z.array(z.string()),
  })
  .strict()

export const metaAdsFileSchema = envelopeSchema.extend({
  dimensions: z.object({ adSets: z.array(metaAdsAdSetSchema) }).strict(),
  facts: z.array(metaAdsFactSchema),
  account: z.array(metaAdsAccountSchema),
})

export type MetaAdsFile = z.infer<typeof metaAdsFileSchema>

// ---------------------------------------------------------------------------
// zoho-crm.json (TAD §7.3, ADR-012/P3′) — one row per lead. `leadSource` is an
// enum of exactly the inbound sources (BRD §7) — Partner/Referral/ZoomInfo are
// excluded by Cowork before write, and this enum makes that exclusion structural:
// any other value fails parse rather than silently passing through.
// ---------------------------------------------------------------------------

export const zohoLeadSourceSchema = z.enum(['Meta Ads', 'SEO', 'Social Media', 'Email Campaign'])

export const zohoLeadStatusSchema = z.enum([
  'Contacted',
  'Attempted to Contact',
  'Lost / Not interested',
  'Contact in Future',
  'Junk',
  'Meeting Scheduled',
])

export const zohoLeadSchema = z
  .object({
    leadId: z.string(),
    createdTime: z.string(),
    leadSource: zohoLeadSourceSchema,
    leadStatus: zohoLeadStatusSchema,
    owner: z.string(),
    /** Bucket label only (TAD §16.1) — never the raw note text. Null until classified. */
    inquiryType: z.string().nullable(),
    // Deliberately NO `notes` field — TAD ADR-012/P3′. Cowork reads notes from its
    // own private Zoho pull for classification, but never writes them here. A row
    // with a `notes` key of any kind fails this `.strict()` schema.
  })
  .strict()

export const zohoCrmFileSchema = envelopeSchema.extend({
  leads: z.array(zohoLeadSchema),
})

export type ZohoCrmFile = z.infer<typeof zohoCrmFileSchema>

// ---------------------------------------------------------------------------
// ga4.json (TAD §7.3, ADR-008) — dimension-sliced arrays, each independently
// summable. Counts only — `bouncedSessions`/`totalSessionDurationSec`, never
// GA4's own `bounceRate`/`averageSessionDuration` rates (P1).
// ---------------------------------------------------------------------------

export const ga4DailySchema = z
  .object({
    date: z.string(),
    /** Non-additive across days (TAD §9.2) — GA4 de-duplicates users. */
    totalUsers: z.number().int().nonnegative(),
    sessions: z.number().int().nonnegative(),
    screenPageViews: z.number().int().nonnegative(),
    engagedSessions: z.number().int().nonnegative(),
    bouncedSessions: z.number().int().nonnegative(),
    totalSessionDurationSec: z.number().nonnegative(),
    // Deliberately NO bounceRate/engagementRate/averageSessionDuration — P1.
  })
  .strict()

export const ga4ChannelSchema = z
  .object({
    date: z.string(),
    channelGroup: z.string(),
    sessions: z.number().int().nonnegative(),
    engagedSessions: z.number().int().nonnegative(),
    bouncedSessions: z.number().int().nonnegative(),
  })
  .strict()

export const ga4SourceSchema = z
  .object({
    date: z.string(),
    source: z.string(),
    channelGroup: z.string(),
    sessions: z.number().int().nonnegative(),
    engagedSessions: z.number().int().nonnegative(),
    bouncedSessions: z.number().int().nonnegative(),
  })
  .strict()

export const ga4PageSchema = z
  .object({
    date: z.string(),
    pagePath: z.string(),
    screenPageViews: z.number().int().nonnegative(),
    totalUsers: z.number().int().nonnegative(),
    engagedSessions: z.number().int().nonnegative(),
    bouncedSessions: z.number().int().nonnegative(),
    totalSessionDurationSec: z.number().nonnegative(),
  })
  .strict()

export const ga4CountrySchema = z
  .object({
    date: z.string(),
    country: z.string(),
    totalUsers: z.number().int().nonnegative(),
    bouncedSessions: z.number().int().nonnegative(),
    totalSessionDurationSec: z.number().nonnegative(),
  })
  .strict()

export const ga4DeviceSchema = z
  .object({
    date: z.string(),
    device: z.string(),
    sessions: z.number().int().nonnegative(),
    engagedSessions: z.number().int().nonnegative(),
  })
  .strict()

export const ga4PathSchema = z
  .object({
    date: z.string(),
    step1: z.string(),
    step2: z.string(),
    sessions: z.number().int().nonnegative(),
  })
  .strict()

export const ga4FileSchema = envelopeSchema.extend({
  daily: z.array(ga4DailySchema),
  channels: z.array(ga4ChannelSchema),
  sources: z.array(ga4SourceSchema),
  pages: z.array(ga4PageSchema),
  countries: z.array(ga4CountrySchema),
  devices: z.array(ga4DeviceSchema),
  paths: z.array(ga4PathSchema),
})

export type Ga4File = z.infer<typeof ga4FileSchema>

// ---------------------------------------------------------------------------
// gsc.json (TAD §7.3, ADR-008) — `sumPosition` (position × impressions), never
// `position` itself, so range average position is impression-weighted (P1).
// ---------------------------------------------------------------------------

export const gscDailySchema = z
  .object({
    date: z.string(),
    clicks: z.number().int().nonnegative(),
    impressions: z.number().int().nonnegative(),
    sumPosition: z.number().nonnegative(),
    rows: z.number().int().nonnegative(),
    /** Set when the queries/pages slices for this day hit the top-N cap (TAD §7.3). */
    truncated: z.boolean().optional(),
    // Deliberately NO `position` — P1; range average is Σ sumPosition ÷ Σ impressions.
  })
  .strict()

export const gscQuerySchema = z
  .object({
    date: z.string(),
    query: z.string(),
    clicks: z.number().int().nonnegative(),
    impressions: z.number().int().nonnegative(),
    sumPosition: z.number().nonnegative(),
  })
  .strict()

export const gscPageSchema = z
  .object({
    date: z.string(),
    page: z.string(),
    clicks: z.number().int().nonnegative(),
    impressions: z.number().int().nonnegative(),
    sumPosition: z.number().nonnegative(),
  })
  .strict()

export const gscCountrySchema = z
  .object({
    date: z.string(),
    country: z.string(),
    clicks: z.number().int().nonnegative(),
    impressions: z.number().int().nonnegative(),
    sumPosition: z.number().nonnegative(),
  })
  .strict()

export const gscDeviceSchema = z
  .object({
    date: z.string(),
    device: z.string(),
    clicks: z.number().int().nonnegative(),
    impressions: z.number().int().nonnegative(),
    sumPosition: z.number().nonnegative(),
  })
  .strict()

export const gscFileSchema = envelopeSchema.extend({
  daily: z.array(gscDailySchema),
  queries: z.array(gscQuerySchema),
  pages: z.array(gscPageSchema),
  countries: z.array(gscCountrySchema),
  devices: z.array(gscDeviceSchema),
})

export type GscFile = z.infer<typeof gscFileSchema>

// ---------------------------------------------------------------------------
// linkedin.json (TAD §7.3, TRD §4.7) — upload-derived, `meta.uploads[]` is the
// coverage source of truth. Counts only throughout — P1 applies here just as
// everywhere else, even though the TRD's illustrative example pre-computed
// `engagementRate`/`ctr`/`reactionsPerPost`. That was never converted when the
// TAD introduced P1; the schema here closes the gap rather than reproduce it
// (same spirit as TAD §17 D5/D7/D8, just not individually listed there).
// ---------------------------------------------------------------------------

export const linkedInUploadSchema = z
  .object({
    coversFrom: z.string(),
    coversTo: z.string(),
    uploadedAt: z.string(),
    fileType: z.string(),
  })
  .strict()
  .refine((u) => u.coversFrom <= u.coversTo, {
    message: 'coversFrom must be on or before coversTo',
    path: ['coversFrom'],
  })

export const linkedInMetaSchema = envelopeMetaSchema.extend({
  uploads: z.array(linkedInUploadSchema),
})

export const linkedInDailyTrendSchema = z
  .object({
    date: z.string(),
    newFollowers: z.number().int().nonnegative(),
    /** Page views on the LinkedIn Page itself (BRD §11.1) — distinct from post impressions. */
    pageViews: z.number().int().nonnegative(),
    /** Non-additive across days, same as ga4.totalUsers/meta.reach (TAD §9.2) — LinkedIn
     *  de-duplicates unique visitors itself; summing days over-counts repeat visitors. */
    uniqueVisitors: z.number().int().nonnegative(),
    impressions: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    reactions: z.number().int().nonnegative(),
    // Deliberately NO engagementRate — P1; derived from reactions/impressions per range.
  })
  .strict()

export const linkedInPostSchema = z
  .object({
    postId: z.string(),
    date: z.string(),
    title: z.string(),
    impressions: z.number().int().nonnegative(),
    clicks: z.number().int().nonnegative(),
    reactions: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
    videoViews: z.number().int().nonnegative().nullable(),
    // Deliberately NO engagementRate/ctr — P1; derived at render, same as everywhere else.
  })
  .strict()

export const linkedInAudienceSchema = z
  .object({
    bySeniority: z.array(z.object({ level: z.string(), count: z.number().int().nonnegative() }).strict()),
    byJobFunction: z.array(z.object({ function: z.string(), count: z.number().int().nonnegative() }).strict()),
    byVisitorIndustry: z.array(z.object({ industry: z.string(), count: z.number().int().nonnegative() }).strict()),
    byCompanySize: z.array(z.object({ companySize: z.string(), count: z.number().int().nonnegative() }).strict()),
  })
  .strict()

export const linkedInCompetitorSchema = z
  .object({
    page: z.string(),
    newFollowers: z.number().int().nonnegative(),
    posts: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
    reactions: z.number().int().nonnegative(),
    // Deliberately NO reactionsPerPost — P1; derived as ratio(reactions, posts) at render.
  })
  .strict()

export const linkedInFileSchema = envelopeSchema.extend({
  meta: linkedInMetaSchema,
  dailyTrend: z.array(linkedInDailyTrendSchema),
  posts: z.array(linkedInPostSchema),
  audience: linkedInAudienceSchema,
  competitors: z.array(linkedInCompetitorSchema),
})

export type LinkedInFile = z.infer<typeof linkedInFileSchema>

// ---------------------------------------------------------------------------
// narratives.json (TAD §10.2, ADR-004) — keyed by flag ID ('channel.category.name'),
// never a range signature. No `meta` envelope — this file has no sync metadata of
// its own, per the TAD/TRD examples.
// ---------------------------------------------------------------------------

/** Dot-separated, lowercase, hyphenated segments — e.g. 'meta.adset.cost-per-conv-outlier'.
 *  A range signature ('2026-06-01_2026-06-30_vs_...') starts with a digit and uses
 *  underscores, so it can never match this pattern (ADR-004's whole point). */
export const flagIdSchema = z
  .string()
  .regex(/^[a-z]+(\.[a-z][a-z0-9-]*)+$/, 'must be a dot-separated flag ID, not a range signature')

export const narrativePhrasingSchema = z
  .object({
    headline: z.string(),
    body: z.string(),
    tier: z.enum(['immediate', 'process', 'strategic', 'observation']),
    authoredBy: z.string().optional(),
    authoredAt: z.string().optional(),
  })
  .strict()

export const narrativesFileSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    phrasings: z.record(flagIdSchema, narrativePhrasingSchema),
  })
  .strict()

export type NarrativesFile = z.infer<typeof narrativesFileSchema>

// ---------------------------------------------------------------------------
// public/data/config/*.json — tunable lists read at render time, not baked
// into a channel file (TASK.md §5). Loose rather than `.strict()`: these are
// hand-edited by the CMO/developer (item 1.1's own note), not machine-written
// by Cowork, so an extra field here is a shrug, not a P1/P3′ violation.
// ---------------------------------------------------------------------------

export const thresholdsConfigSchema = z.object({
  schemaVersion: z.number().int().positive(),
  leading: z.object({ favourablePct: z.number() }),
  good: z.object({ withinPct: z.number() }),
  monitor: z.object({ unfavourablePctMin: z.number(), unfavourablePctMax: z.number() }),
  actionNeeded: z.object({ unfavourablePctMin: z.number() }),
  flatBand: z.object({ pct: z.number() }),
  targetBands: z.record(z.string(), z.object({ min: z.number().optional(), max: z.number().optional(), statusIfMet: z.enum(['leading', 'good', 'monitor', 'action-needed']) })),
  floors: z.record(z.string(), z.number().nullable()),
})

export type ThresholdsConfigFile = z.infer<typeof thresholdsConfigSchema>

export const brandTermsConfigSchema = z.object({
  schemaVersion: z.number().int().positive(),
  terms: z.array(z.string()),
})

export type BrandTermsConfigFile = z.infer<typeof brandTermsConfigSchema>
