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
