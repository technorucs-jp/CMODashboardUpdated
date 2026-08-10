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
