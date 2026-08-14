import { queryZoho, type ZohoCrmFileShape, type ZohoLead, type ZohoLeadSource, type ZohoLeadStatus } from '@/lib/channels/zoho'
import type { ChannelResult } from '@/lib/coverage/coverage'
import { formatMetricValue } from '@/lib/metrics/format'
import { ratio, resolve } from '@/lib/metrics/ratio'
import { eachDateInRange, type DateRange } from '@/lib/time/range'
import { toBusinessDate } from '@/lib/time/businessDate'

/**
 * Composes the Leads tab's view model (items 3.7-3.16). BRD §7.
 *
 * **P3′, two layers deep (item 3.7).** `zoho-crm.json`'s schema (item 1.4) is
 * `.strict()` with no `notes` property at all, so a file carrying lead free-text
 * fails to parse before this file ever sees it. This view model then only ever
 * reads `leadStatus`, `leadSource`, `owner`, `createdTime` and `inquiryType` —
 * it emits counts and rates, never a lead's text, so there would be nothing to
 * leak even if a `notes` field somehow survived. Both layers are asserted in
 * `leads.test.ts`.
 *
 * **Every status renders, including zero-count ones (item 3.8).** BRD v2.1 §7.1
 * was written specifically to forbid dropping "Contact in Future" and "Junk"
 * when they are 0 — the current static build omits them, and
 * `Wireframe/02-leads-top.jpg` shows exactly that bug (8 cards where there
 * should be 10). A zero is a data point ("no lead reached this stage"), which
 * is distinct from not tracking the stage at all. `STATUS_CARD_ORDER` below is a
 * fixed list, not derived from the filtered leads, so a status can never vanish.
 *
 * **Every active rep renders, including zero-assignment ones (item 3.14).** Same
 * principle, different table: the roster comes from `config/sales-reps.json`,
 * never from the filtered lead set, because "Rathish, Mohan and Ram got zero
 * leads" *is* the finding (BRD §7.3) and it disappears if the rows are derived
 * from leads that don't exist. The table renders the **union** of the configured
 * roster and any owner actually observed in the range, so a lead assigned to
 * someone missing from the config is never silently dropped from the totals
 * either — the roster decides who is guaranteed a row, not who is allowed one.
 */

/** Fixed order — never derived from the data, so a zero-count status still renders (item 3.8). */
const STATUS_CARD_ORDER: readonly ZohoLeadStatus[] = [
  'Contacted',
  'Attempted to Contact',
  'Lost / Not interested',
  'Contact in Future',
  'Junk',
  'Meeting Scheduled',
]

/** Fixed order — same reasoning as the statuses above (BRD §7.1's four inbound sources). */
const SOURCE_ORDER: readonly ZohoLeadSource[] = ['Meta Ads', 'SEO', 'Social Media', 'Email Campaign']

export interface OverviewCard {
  readonly label: string
  readonly value: string
  readonly detail: string
}

export interface SourceBreakdownRow {
  readonly source: ZohoLeadSource
  readonly count: number
  readonly countDisplay: string
  readonly sharePercent: number
  readonly shareDisplay: string
}

export interface StatusBreakdownRow {
  readonly status: ZohoLeadStatus
  readonly count: number
  readonly countDisplay: string
  readonly sharePercent: number
  readonly shareDisplay: string
}

export interface DailyVolumePoint {
  readonly date: string
  /** One entry per source in `SOURCE_ORDER`, so the stacked bars have a stable series order. */
  readonly bySource: Readonly<Record<ZohoLeadSource, number>>
  readonly total: number
}

export interface RepRow {
  readonly rep: string
  readonly assigned: number
  readonly assignedDisplay: string
  readonly contacted: number
  readonly attempted: number
  readonly lost: number
  readonly meetings: number
  /** `—` for every count column and "Not assigned" for the rate when a rep has no leads (item 3.14). */
  readonly contactedDisplay: string
  readonly attemptedDisplay: string
  readonly lostDisplay: string
  readonly meetingsDisplay: string
  readonly contactRateDisplay: string
  /** True when this rep is on the configured roster but has no leads in the range. */
  readonly unassigned: boolean
}

export interface LeadsViewModel {
  readonly coverage: ChannelResult<unknown>['coverage']
  readonly hasData: boolean
  readonly overviewCards: readonly OverviewCard[] | null
  readonly sourceBreakdown: readonly SourceBreakdownRow[] | null
  /** Status split of Meta Ads leads only (item 3.11's donut) — zero-count statuses included. */
  readonly metaStatusBreakdown: readonly StatusBreakdownRow[] | null
  /** Status split across every inbound source (item 3.12) — zero-count statuses included. */
  readonly allStatusBreakdown: readonly StatusBreakdownRow[] | null
  readonly dailyVolume: readonly DailyVolumePoint[] | null
  readonly repTable: readonly RepRow[] | null
  /** `null` until the CMO resolves TAD §16.1 — the panel renders an explicit unclassified state (item 3.16). */
  readonly intentBuckets: null
  /** How many leads in range carry no `inquiryType`, so the unclassified panel can say so concretely. */
  readonly unclassifiedLeadCount: number | null
}

function countBy<T extends string>(leads: readonly ZohoLead[], key: (lead: ZohoLead) => T): Record<T, number> {
  const counts = {} as Record<T, number>
  for (const lead of leads) {
    const k = key(lead)
    counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}

function shareRows<T extends string>(
  order: readonly T[],
  counts: Record<T, number>,
  total: number,
): { key: T; count: number; countDisplay: string; sharePercent: number; shareDisplay: string }[] {
  return order.map((key) => {
    const count = counts[key] ?? 0
    const share = resolve(ratio(count, total))
    const sharePercent = share === null ? 0 : share * 100
    return {
      key,
      count,
      countDisplay: formatMetricValue(count, 'integer'),
      sharePercent,
      shareDisplay: formatMetricValue(share === null ? null : sharePercent, 'percent'),
    }
  })
}

export function buildLeadsViewModel(
  file: ZohoCrmFileShape,
  range: DateRange,
  roster: readonly string[],
): LeadsViewModel {
  const result = queryZoho(file, range)

  if (result.data === null) {
    return {
      coverage: result.coverage,
      hasData: false,
      overviewCards: null,
      sourceBreakdown: null,
      metaStatusBreakdown: null,
      allStatusBreakdown: null,
      dailyVolume: null,
      repTable: null,
      intentBuckets: null,
      unclassifiedLeadCount: null,
    }
  }

  const { leads, summary } = result.data
  const total = summary.totalInbound
  const contactRate = resolve(summary.contactRate)

  // --- Overview cards (item 3.8/3.9). Sources and statuses both come from fixed
  // lists, so a zero-count card still renders — the BRD v2.1 §7.1 bug this exists to fix.
  const sourceCounts = countBy(leads, (l) => l.leadSource)
  const statusCounts = countBy(leads, (l) => l.leadStatus)

  const sourceBreakdown: SourceBreakdownRow[] = shareRows(SOURCE_ORDER, sourceCounts, total).map((r) => ({
    source: r.key,
    count: r.count,
    countDisplay: r.countDisplay,
    sharePercent: r.sharePercent,
    shareDisplay: r.shareDisplay,
  }))

  const statusShare = (status: ZohoLeadStatus): string => {
    const share = resolve(ratio(statusCounts[status] ?? 0, total))
    return formatMetricValue(share === null ? null : share * 100, 'percent')
  }

  const overviewCards: OverviewCard[] = [
    {
      label: 'Total inbound leads',
      value: formatMetricValue(total, 'integer'),
      detail: SOURCE_ORDER.filter((s) => (sourceCounts[s] ?? 0) > 0).join(' + ') || 'No inbound sources',
    },
    ...SOURCE_ORDER.map((source) => ({
      label: `${source} leads`,
      value: formatMetricValue(sourceCounts[source] ?? 0, 'integer'),
      detail: `${sourceBreakdown.find((r) => r.source === source)!.shareDisplay} of inbound`,
    })),
    {
      label: 'Contacted',
      value: formatMetricValue(statusCounts['Contacted'] ?? 0, 'integer'),
      detail: `${formatMetricValue(contactRate === null ? null : contactRate * 100, 'percent')} contact rate`,
    },
    {
      label: 'Attempted',
      value: formatMetricValue(statusCounts['Attempted to Contact'] ?? 0, 'integer'),
      detail: `${statusShare('Attempted to Contact')} stuck here`,
    },
    {
      label: 'Lost / not interested',
      value: formatMetricValue(statusCounts['Lost / Not interested'] ?? 0, 'integer'),
      detail: `${statusShare('Lost / Not interested')} lost rate`,
    },
    {
      label: 'Contact in Future',
      value: formatMetricValue(statusCounts['Contact in Future'] ?? 0, 'integer'),
      detail: `${statusShare('Contact in Future')} of inbound`,
    },
    {
      label: 'Junk',
      value: formatMetricValue(statusCounts['Junk'] ?? 0, 'integer'),
      detail: `${statusShare('Junk')} of inbound`,
    },
    {
      label: 'Meetings scheduled',
      value: formatMetricValue(statusCounts['Meeting Scheduled'] ?? 0, 'integer'),
      detail: `${statusShare('Meeting Scheduled')} of inbound`,
    },
    {
      label: 'Active days',
      value: formatMetricValue(summary.activeDays, 'integer'),
      detail: `of ${formatMetricValue(eachDateInRange(range).length, 'integer')} days in range`,
    },
  ]

  // --- Status distributions (items 3.11, 3.12). Both keep every status in the
  // fixed order, including zeroes.
  const metaLeads = leads.filter((l) => l.leadSource === 'Meta Ads')
  const metaStatusCounts = countBy(metaLeads, (l) => l.leadStatus)

  const metaStatusBreakdown: StatusBreakdownRow[] = shareRows(
    STATUS_CARD_ORDER,
    metaStatusCounts,
    metaLeads.length,
  ).map((r) => ({ status: r.key, count: r.count, countDisplay: r.countDisplay, sharePercent: r.sharePercent, shareDisplay: r.shareDisplay }))

  const allStatusBreakdown: StatusBreakdownRow[] = shareRows(STATUS_CARD_ORDER, statusCounts, total).map((r) => ({
    status: r.key,
    count: r.count,
    countDisplay: r.countDisplay,
    sharePercent: r.sharePercent,
    shareDisplay: r.shareDisplay,
  }))

  // --- Daily volume (item 3.13) — one slot per day in the range, INCLUDING days
  // with zero leads. Deriving the axis from the leads themselves would silently
  // collapse the gaps, and the gaps are the point ("active on 16 of 30 days").
  const leadsByDate = new Map<string, ZohoLead[]>()
  for (const lead of leads) {
    const date = toBusinessDate(lead.createdTime)
    const bucket = leadsByDate.get(date)
    if (bucket) bucket.push(lead)
    else leadsByDate.set(date, [lead])
  }

  const dailyVolume: DailyVolumePoint[] = eachDateInRange(range).map((date) => {
    const dayLeads = leadsByDate.get(date) ?? []
    const bySource = Object.fromEntries(
      SOURCE_ORDER.map((source) => [source, dayLeads.filter((l) => l.leadSource === source).length]),
    ) as Record<ZohoLeadSource, number>
    return { date, bySource, total: dayLeads.length }
  })

  // --- Rep table (item 3.14) — roster first (so a zero-assignment rep keeps its
  // row and its position), then any observed owner the roster doesn't list.
  const observedOwners = [...new Set(leads.map((l) => l.owner))]
  const repNames = [...roster, ...observedOwners.filter((owner) => !roster.includes(owner))]

  const repTable: RepRow[] = repNames.map((rep) => {
    const repLeads = leads.filter((l) => l.owner === rep)
    const assigned = repLeads.length
    const contacted = repLeads.filter((l) => l.leadStatus === 'Contacted').length
    const attempted = repLeads.filter((l) => l.leadStatus === 'Attempted to Contact').length
    const lost = repLeads.filter((l) => l.leadStatus === 'Lost / Not interested').length
    const meetings = repLeads.filter((l) => l.leadStatus === 'Meeting Scheduled').length
    const rate = resolve(ratio(contacted, assigned))
    const unassigned = assigned === 0

    return {
      rep,
      assigned,
      assignedDisplay: formatMetricValue(assigned, 'integer'),
      contacted,
      attempted,
      lost,
      meetings,
      // A rep with no leads shows — rather than a row of zeroes: "no leads were
      // routed here" is a different statement from "leads arrived and none were
      // contacted", and the wireframe distinguishes them the same way.
      contactedDisplay: unassigned ? '—' : formatMetricValue(contacted, 'integer'),
      attemptedDisplay: unassigned ? '—' : formatMetricValue(attempted, 'integer'),
      lostDisplay: unassigned ? '—' : formatMetricValue(lost, 'integer'),
      meetingsDisplay: unassigned ? '—' : formatMetricValue(meetings, 'integer'),
      contactRateDisplay: unassigned ? 'Not assigned' : formatMetricValue(rate === null ? null : rate * 100, 'percent'),
      unassigned,
    }
  })

  return {
    coverage: result.coverage,
    hasData: true,
    overviewCards,
    sourceBreakdown,
    metaStatusBreakdown,
    allStatusBreakdown,
    dailyVolume,
    repTable,
    // TAD §16.1 is unresolved — `inquiryType` stays null and the panel renders an
    // explicit "not yet classified" state. Do NOT implement either classifier here
    // (TASK.md §8); whichever path the CMO picks writes the bucket at ingestion.
    intentBuckets: null,
    unclassifiedLeadCount: leads.filter((l) => l.inquiryType === null).length,
  }
}
