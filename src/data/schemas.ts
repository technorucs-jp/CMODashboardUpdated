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
