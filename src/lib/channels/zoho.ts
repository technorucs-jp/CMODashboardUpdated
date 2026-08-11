import { computeCoverage, toChannelResult, type ChannelResult } from '../coverage/coverage'
import { containsDate, type DateRange } from '../time/range'
import { toBusinessDate } from '../time/businessDate'
import { ratio, type Ratio } from '../metrics/ratio'

/** Locally declared, not imported from src/data/schemas.ts (P6 — see metaAds.ts's note). */
export type ZohoLeadSource = 'Meta Ads' | 'SEO' | 'Social Media' | 'Email Campaign'
export type ZohoLeadStatus =
  | 'Contacted'
  | 'Attempted to Contact'
  | 'Lost / Not interested'
  | 'Contact in Future'
  | 'Junk'
  | 'Meeting Scheduled'

export interface ZohoLead {
  readonly leadId: string
  readonly createdTime: string
  readonly leadSource: ZohoLeadSource
  readonly leadStatus: ZohoLeadStatus
  readonly owner: string
  readonly inquiryType: string | null
}

export interface ZohoCrmFileShape {
  readonly meta: { readonly earliestRecordDate: string; readonly latestRecordDate: string }
  readonly leads: readonly ZohoLead[]
}

/** BRD §7 — the only sources ever counted as inbound; defensive re-check at query
 *  time even though ingestion already excludes Partner/Referral/ZoomInfo (item 1.24). */
const INBOUND_SOURCES = new Set<ZohoLeadSource>(['Meta Ads', 'SEO', 'Social Media', 'Email Campaign'])

export interface ZohoStatusCounts {
  readonly contacted: number
  readonly attempted: number
  readonly lost: number
  readonly contactInFuture: number
  readonly junk: number
  readonly meetingsScheduled: number
}

export interface ZohoSummary extends ZohoStatusCounts {
  readonly totalInbound: number
  readonly contactRate: Ratio
  readonly activeDays: number
}

export interface ZohoQueryResult {
  /** Leads already filtered to the range and to inbound sources — never contains `notes` (P3′). */
  readonly leads: readonly ZohoLead[]
  readonly summary: ZohoSummary
}

function countStatus(leads: readonly ZohoLead[], status: ZohoLeadStatus): number {
  return leads.filter((l) => l.leadStatus === status).length
}

export function queryZoho(file: ZohoCrmFileShape, range: DateRange): ChannelResult<ZohoQueryResult> {
  const coverage = computeCoverage(range, file.meta.earliestRecordDate, file.meta.latestRecordDate)

  return toChannelResult(coverage, () => {
    const leads = file.leads.filter(
      (l) => INBOUND_SOURCES.has(l.leadSource) && containsDate(range, toBusinessDate(l.createdTime)),
    )

    const contacted = countStatus(leads, 'Contacted')
    const attempted = countStatus(leads, 'Attempted to Contact')
    const lost = countStatus(leads, 'Lost / Not interested')
    const contactInFuture = countStatus(leads, 'Contact in Future')
    const junk = countStatus(leads, 'Junk')
    const meetingsScheduled = countStatus(leads, 'Meeting Scheduled')

    const activeDays = new Set(leads.map((l) => toBusinessDate(l.createdTime))).size

    return {
      leads,
      summary: {
        totalInbound: leads.length,
        contacted,
        attempted,
        lost,
        contactInFuture,
        junk,
        meetingsScheduled,
        contactRate: ratio(contacted, leads.length),
        activeDays,
      },
    }
  })
}
