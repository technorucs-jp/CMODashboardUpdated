import { load, loadConfig } from '@/data/loader'
import { BarRow } from '@/components/data/BarRow'
import { CardSkeleton } from '@/components/data/CardSkeleton'
import { DonutChart } from '@/components/data/DonutChart'
import { KpiCard } from '@/components/data/KpiCard'
import { LastSyncedBadge } from '@/components/data/LastSyncedBadge'
import { NarrativeBlock } from '@/components/narrative/NarrativeBlock'
import { ActionList } from '@/components/narrative/ActionList'
import { SeriesBarChart } from '@/components/data/SeriesBarChart'
import { CoverageState } from '@/components/states/CoverageState'
import { buildLeadsViewModel } from '@/viewmodels/leads'
import { useMetricsQuery } from './useMetricsQuery'
import { useRangeState } from './useRangeState'

const SOURCE_COLORS: Record<string, string> = {
  'Meta Ads': 'var(--hue-blue)',
  SEO: 'var(--hue-green)',
  'Social Media': 'var(--hue-purple)',
  'Email Campaign': 'var(--hue-yellow)',
}

const STATUS_COLORS: Record<string, string> = {
  Contacted: 'var(--hue-green)',
  'Attempted to Contact': 'var(--hue-yellow)',
  'Lost / Not interested': 'var(--hue-red)',
  'Contact in Future': 'var(--hue-blue)',
  Junk: 'var(--pill-muted-text)',
  'Meeting Scheduled': 'var(--hue-purple)',
}

const CARD_ACCENTS = [
  'var(--accent-1)',
  'var(--accent-2)',
  'var(--accent-3)',
  'var(--accent-4)',
  'var(--accent-5)',
  'var(--accent-6)',
  'var(--accent-7)',
  'var(--accent-8)',
]

/**
 * The Leads tab (items 3.7-3.16). BRD §7.
 *
 * Two things here are deliberately *not* driven by the data: the overview-card
 * list and the rep table's rows. Both come from fixed lists (a status/source
 * enum, and `config/sales-reps.json`) precisely so a zero-count status or a
 * zero-assignment rep still renders — see `src/viewmodels/leads.ts`'s header
 * comment for why that matters (it is the specific bug BRD v2.1 §7.1 was
 * written to forbid, and the finding BRD §7.3 depends on).
 */
export default function LeadsPage() {
  const { range, comparisonRange } = useRangeState()

  const { data: vm, isLoading } = useMetricsQuery('leads', range, comparisonRange, async () => {
    const [file, repsConfig, narratives] = await Promise.all([
      load('zoho-crm'),
      loadConfig('sales-reps'),
      load('narratives').catch(() => null),
    ])
    const roster = repsConfig.reps.filter((r) => r.active).map((r) => r.name)
    return buildLeadsViewModel(file, range, roster, narratives)
  })

  return (
    <div>
      <h1>Leads</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <p style={{ margin: 0 }}>Zoho CRM · Inbound only (Meta Ads + SEO sources) · Partner, Referral, ZoomInfo excluded</p>
        <LastSyncedBadge channel="zoho-crm" />
      </div>

      {isLoading && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <CardSkeleton key={i} height={80} />
          ))}
        </div>
      )}

      {!isLoading && vm && !vm.hasData && <CoverageState coverage={vm.coverage} />}

      {!isLoading && vm && vm.hasData && (
        <>
          <h2>
            Inbound leads overview — {range.from} to {range.to}
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {vm.overviewCards!.map((c, i) => (
              <KpiCard
                key={c.label}
                label={c.label}
                value={c.value}
                detail={c.detail}
                accent={CARD_ACCENTS[i % CARD_ACCENTS.length]}
              />
            ))}
          </div>

          <h2>Lead source breakdown</h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px' }}>
              <h3>Inbound sources</h3>
              {vm.sourceBreakdown!.map((r) => (
                <BarRow
                  key={r.source}
                  label={r.source}
                  value={`${r.countDisplay} (${r.shareDisplay})`}
                  sharePercent={r.sharePercent}
                  color={SOURCE_COLORS[r.source] ?? 'var(--accent-1)'}
                />
              ))}
            </div>
            <div style={{ flex: '1 1 320px' }}>
              <h3>Meta Ads — lead status</h3>
              <DonutChart
                data={vm.metaStatusBreakdown!
                  .filter((r) => r.count > 0)
                  .map((r) => ({
                    name: r.status,
                    value: r.count,
                    color: STATUS_COLORS[r.status] ?? 'var(--accent-1)',
                  }))}
              />
              <ul>
                {vm.metaStatusBreakdown!.map((r) => (
                  <li key={r.status}>
                    {r.status}: {r.countDisplay} ({r.shareDisplay})
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <h2>Daily inbound volume</h2>
          <SeriesBarChart
            ariaLabel="Daily inbound lead volume by source"
            stacked
            rows={vm.dailyVolume!.map((d) => ({ category: d.date.slice(8), values: d.bySource }))}
            series={vm.sourceBreakdown!.map((s) => ({
              key: s.source,
              label: s.source,
              color: SOURCE_COLORS[s.source] ?? 'var(--accent-1)',
            }))}
          />

          <h2>All inbound leads — status distribution</h2>
          {vm.allStatusBreakdown!.map((r) => (
            <BarRow
              key={r.status}
              label={r.status}
              value={`${r.countDisplay} (${r.shareDisplay})`}
              sharePercent={r.sharePercent}
              color={STATUS_COLORS[r.status] ?? 'var(--accent-1)'}
            />
          ))}

          <h2>Meta Ads leads — intent bucket analysis</h2>
          <div className="card" style={{ padding: 16 }} role="status">
            <strong>Not yet classified.</strong>
            <p>
              All {vm.unclassifiedLeadCount} leads in this range have no inquiry type recorded. Intent buckets need a
              classification source that does not exist yet — either a required <code>Inquiry_Type</code> picklist in
              Zoho CRM, or a classification pass in the sync job. This is an open decision (TAD §16.1); no classifier is
              implemented here by design.
            </p>
          </div>

          <h2>Sales rep performance — inbound leads</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Rep</th>
                  <th style={{ textAlign: 'right' }}>Assigned</th>
                  <th style={{ textAlign: 'right' }}>Contacted</th>
                  <th style={{ textAlign: 'right' }}>Attempted</th>
                  <th style={{ textAlign: 'right' }}>Lost</th>
                  <th style={{ textAlign: 'right' }}>Meeting</th>
                  <th style={{ textAlign: 'right' }}>Contact rate</th>
                </tr>
              </thead>
              <tbody>
                {vm.repTable!.map((r) => (
                  <tr key={r.rep}>
                    <td>{r.rep}</td>
                    <td style={{ textAlign: 'right' }}>{r.assignedDisplay}</td>
                    <td style={{ textAlign: 'right' }}>{r.contactedDisplay}</td>
                    <td style={{ textAlign: 'right' }}>{r.attemptedDisplay}</td>
                    <td style={{ textAlign: 'right' }}>{r.lostDisplay}</td>
                    <td style={{ textAlign: 'right' }}>{r.meetingsDisplay}</td>
                    <td style={{ textAlign: 'right' }}>{r.contactRateDisplay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Contacted vs. attempted by rep</h2>
          <SeriesBarChart
            ariaLabel="Contacted versus attempted leads by sales rep"
            rows={vm.repTable!.map((r) => ({
              category: r.rep,
              values: { Contacted: r.contacted, Attempted: r.attempted, Lost: r.lost },
            }))}
            series={[
              { key: 'Contacted', label: 'Contacted', color: 'var(--hue-green)' },
              { key: 'Attempted', label: 'Attempted', color: 'var(--hue-yellow)' },
              { key: 'Lost', label: 'Lost', color: 'var(--hue-red)' },
            ]}
          />

          <NarrativeBlock flags={vm.narrativeFlags} />
          <ActionList flags={vm.narrativeFlags} />
        </>
      )}
    </div>
  )
}
