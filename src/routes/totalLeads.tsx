import type { CSSProperties } from 'react'
import { load } from '@/data/loader'
import { CardSkeleton } from '@/components/data/CardSkeleton'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { KpiCard } from '@/components/data/KpiCard'
import { LastSyncedBadge } from '@/components/data/LastSyncedBadge'
import { NarrativeBlock } from '@/components/narrative/NarrativeBlock'
import { ActionList } from '@/components/narrative/ActionList'
import { CoverageState } from '@/components/states/CoverageState'
import {
  buildTotalLeadsViewModel,
  type CampaignComparisonRow,
} from '@/viewmodels/totalLeads'
import { useMetricsQuery } from './useMetricsQuery'
import { useRangeState } from './useRangeState'
import { useChannelMeta } from './useChannelMeta'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

const CARD_ACCENTS = [
  'var(--accent-1)',
  'var(--accent-2)',
  'var(--accent-3)',
  'var(--accent-4)',
]

const CAMPAIGN_COLUMNS: DataTableColumn<CampaignComparisonRow>[] = [
  { key: 'name', label: 'Campaign name', accessor: (r) => r.campaignName },
  {
    key: 'conversations',
    label: 'Leads (Prim / Comp)',
    accessor: (r) => r.primary.conversations,
    render: (r) => (
      <span>
        <strong>{r.primary.conversationsDisplay}</strong>{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>/ {r.comparison.conversationsDisplay}</span>
      </span>
    ),
    align: 'right',
  },
  {
    key: 'convDelta',
    label: 'Lead Δ %',
    accessor: (r) => r.conversationDeltaDisplay,
    render: (r) => {
      const isPos = r.conversationDeltaDisplay.startsWith('+')
      const isNeg = r.conversationDeltaDisplay.startsWith('-')
      const color = isPos ? 'var(--hue-green)' : isNeg ? 'var(--hue-red)' : 'var(--color-text-secondary)'
      return <span style={{ color, fontWeight: 600 }}>{r.conversationDeltaDisplay}</span>
    },
    align: 'right',
  },
  {
    key: 'costPerConv',
    label: 'Cost / Lead (Prim / Comp)',
    accessor: (r) => r.primary.costPerConvDisplay,
    render: (r) => (
      <span>
        <strong>{r.primary.costPerConvDisplay}</strong>{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>/ {r.comparison.costPerConvDisplay}</span>
      </span>
    ),
    align: 'right',
  },
  {
    key: 'spend',
    label: 'Spend (Prim / Comp)',
    accessor: (r) => r.primary.spend,
    render: (r) => (
      <span>
        <strong>{r.primary.spendDisplay}</strong>{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>/ {r.comparison.spendDisplay}</span>
      </span>
    ),
    align: 'right',
  },
  {
    key: 'impressions',
    label: 'Impressions (Prim / Comp)',
    accessor: (r) => r.primary.impressions,
    render: (r) => (
      <span>
        {r.primary.impressionsDisplay}{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>/ {r.comparison.impressionsDisplay}</span>
      </span>
    ),
    align: 'right',
  },
  {
    key: 'reach',
    label: 'Reach (Prim / Comp)',
    accessor: (r) => r.primary.reach,
    render: (r) => (
      <span>
        {r.primary.reachDisplay}{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>/ {r.comparison.reachDisplay}</span>
      </span>
    ),
    align: 'right',
  },
]

/**
 * Total Leads tab — Meta Ads paid lead gen comparison & campaign breakdown (items 3.41-3.44). BRD §12.
 */
export default function TotalLeadsPage() {
  const { range, comparisonRange } = useRangeState()
  const syncMeta = useChannelMeta('meta-ads')

  const { data: vm, isLoading } = useMetricsQuery('total-leads', range, comparisonRange, async () => {
    const [file, narratives] = await Promise.all([
      load('meta-ads'),
      load('narratives').catch(() => null),
    ])
    return buildTotalLeadsViewModel(file, range, comparisonRange, narratives)
  })

  return (
    <div className="page" style={{ '--page-accent': 'var(--accent-3)' } as CSSProperties}>
      <h1 className="page-title">Total Leads</h1>
      <div className="page-subtitle">
        <p style={{ margin: 0 }}>Meta Ads · Paid Campaign Performance & Cross-Period Comparison</p>
        <LastSyncedBadge channel="meta-ads" metaEnvelope={syncMeta} />
      </div>

      {/* Item 3.41 — Comparison required notice & fallback label */}
      {vm && (
        <div
          role="status"
          aria-label="Comparison period notice"
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {vm.comparisonLabel}
        </div>
      )}

      {isLoading && (
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} height={90} />
          ))}
        </div>
      )}

      {!isLoading && vm && !vm.hasData && <CoverageState coverage={vm.coverage} />}

      {!isLoading && vm && vm.hasData && (
        <>
          <h2 className="section-title">Headline comparison — {vm.primaryRange.from} to {vm.primaryRange.to}</h2>
          <div className="kpi-grid">
            {vm.cards!.map((c, i) => (
              <KpiCard
                key={c.label}
                label={c.label}
                value={c.primaryValue}
                detail={`${c.detail} (${c.changeDisplay})`}
                accent={CARD_ACCENTS[i % CARD_ACCENTS.length]}
              />
            ))}
          </div>

          <h2 className="section-title">Conversations by campaign (Period vs. Comparison)</h2>
          {/* The category axis is the UNION of both periods' campaigns, so a campaign
              that ran in only one month correctly shows a single bar (the wireframe
              behaves the same way — "Custom ERP TN" is May-only). That union can run
              to ~20 categories, so the labels need real room and a length cap or they
              overlap into an unreadable smear. */}
          <div className="panel chart-panel" style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={vm.chartData ?? []}
                margin={{ top: 10, right: 30, left: 10, bottom: 96 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="campaignName"
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  tickFormatter={(name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name)}
                />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-2)',
                    borderColor: 'var(--color-border)',
                    borderRadius: 6,
                    color: 'var(--color-text-primary)',
                    fontSize: 12,
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="primaryConversations" name="Current Period" fill="var(--accent-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comparisonConversations" name="Comparison Period" fill="var(--accent-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2 className="section-title">Campaign breakdown & totals per period</h2>
          <DataTable
            columns={CAMPAIGN_COLUMNS}
            rows={vm.campaigns ?? []}
            getRowKey={(r) => r.campaignId}
          />

          {vm.totals && (
            <div
              style={{
                marginTop: 12,
                padding: '12px 16px',
                borderRadius: 6,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <div>Account Totals:</div>
              <div>
                Leads: {vm.totals.primary.conversationsDisplay} / {vm.totals.comparison.conversationsDisplay} ({vm.totals.conversationDeltaDisplay})
              </div>
              <div>
                Cost/Lead: {vm.totals.primary.costPerConvDisplay} / {vm.totals.comparison.costPerConvDisplay}
              </div>
              <div>
                Spend: {vm.totals.primary.spendDisplay} / {vm.totals.comparison.spendDisplay}
              </div>
              <div>
                Impressions: {vm.totals.primary.impressionsDisplay} / {vm.totals.comparison.impressionsDisplay}
              </div>
            </div>
          )}

          <NarrativeBlock flags={vm.narrativeFlags} />
          <ActionList flags={vm.narrativeFlags} />
        </>
      )}
    </div>
  )
}
