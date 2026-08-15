import { load } from '@/data/loader'
import { buildAdCampaignsViewModel } from '@/viewmodels/adCampaigns'
import { BarRow } from '@/components/data/BarRow'
import { CardSkeleton } from '@/components/data/CardSkeleton'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { DonutChart } from '@/components/data/DonutChart'
import { HorizontalBarChart } from '@/components/data/HorizontalBarChart'
import { KpiCard } from '@/components/data/KpiCard'
import { LastSyncedBadge } from '@/components/data/LastSyncedBadge'
import { NarrativeBlock } from '@/components/narrative/NarrativeBlock'
import { ActionList } from '@/components/narrative/ActionList'
import { CoverageState } from '@/components/states/CoverageState'
import { useMetricsQuery } from './useMetricsQuery'
import { useRangeState } from './useRangeState'
import { useChannelMeta } from './useChannelMeta'
import type { AdSetTableRow } from '@/viewmodels/adCampaigns'

const COUNTRY_DONUT_COLORS = ['var(--hue-blue)', 'var(--hue-green)', 'var(--hue-yellow)', 'var(--hue-purple)', 'var(--hue-red)']

const AD_SET_COLUMNS: DataTableColumn<AdSetTableRow>[] = [
  { key: 'name', label: 'Ad set / campaign', accessor: (r) => r.name },
  { key: 'launchDate', label: 'Launch date', accessor: (r) => r.launchDate },
  { key: 'region', label: 'Region', accessor: (r) => r.region },
  { key: 'spend', label: 'Spend (₹)', accessor: (r) => r.spend, render: (r) => r.spendDisplay, align: 'right' },
  { key: 'impressions', label: 'Impressions', accessor: (r) => r.impressions, render: (r) => r.impressionsDisplay, align: 'right' },
  { key: 'clicks', label: 'Clicks', accessor: (r) => r.clicks, render: (r) => r.clicksDisplay, align: 'right' },
  { key: 'ctr', label: 'CTR', accessor: (r) => r.ctr, render: (r) => r.ctrDisplay, align: 'right' },
  { key: 'cpc', label: 'CPC (₹)', accessor: (r) => r.cpc, align: 'right' },
  { key: 'cpm', label: 'CPM (₹)', accessor: (r) => r.cpm, align: 'right' },
  { key: 'reach', label: 'Reach', accessor: (r) => r.reachDisplay, align: 'right' },
  { key: 'conversations', label: 'Conversations', accessor: (r) => r.conversations, render: (r) => r.conversationsDisplay, align: 'right' },
  { key: 'costPerConv', label: 'Cost/conv (₹)', accessor: (r) => r.costPerConv, render: (r) => r.costPerConvDisplay, align: 'right' },
]

export default function AdCampaignsPage() {
  const { range, comparisonRange } = useRangeState()
  const syncMeta = useChannelMeta('meta-ads')

  const { data: vm, isLoading } = useMetricsQuery('ad-campaigns', range, comparisonRange, async () => {
    const [file, narratives] = await Promise.all([
      load('meta-ads'),
      load('narratives').catch(() => null),
    ])
    return buildAdCampaignsViewModel(file, range, narratives)
  })

  return (
    <div>
      <h1 className="page-title">Ad Campaigns</h1>
      <div className="page-subtitle">
        <p style={{ margin: 0 }}>Meta Ads · TechnoRUCS Marketing</p>
        <LastSyncedBadge channel="meta-ads" metaEnvelope={syncMeta} />
      </div>

      {isLoading && (
        <div className="kpi-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} height={80} />
          ))}
        </div>
      )}

      {!isLoading && vm && !vm.hasData && <CoverageState coverage={vm.coverage} />}

      {!isLoading && vm && vm.hasData && vm.accountCards && (
        <>
          <h2 className="section-title">Account overview — {range.from} to {range.to}</h2>
          <div className="kpi-grid">
            <KpiCard label="Total spend" value={vm.accountCards.spend} accent="var(--accent-1)" />
            <KpiCard label="Impressions" value={vm.accountCards.impressions} accent="var(--accent-2)" />
            <KpiCard label="Reach" value={vm.accountCards.reach} accent="var(--accent-4)" />
            <KpiCard label="Clicks (all)" value={vm.accountCards.clicks} accent="var(--accent-5)" />
            <KpiCard label="Conversations" value={vm.accountCards.conversations} accent="var(--accent-7)" />
            <KpiCard label="Avg. CPC" value={vm.accountCards.cpc} accent="var(--accent-6)" />
            <KpiCard label="CPM" value={vm.accountCards.cpm} accent="var(--accent-3)" />
            <KpiCard label="Frequency" value={vm.accountCards.frequency} accent="var(--accent-8)" />
          </div>

          <h2 className="section-title">Active ad sets — spend breakdown</h2>
          <DataTable
            columns={AD_SET_COLUMNS}
            rows={vm.adSetTable ?? []}
            getRowKey={(r) => `${r.adSetId}-${r.launchDate}`}
            totalsLabel="Total (active ad sets)"
            totals={
              vm.totalsRow
                ? { spend: vm.totalsRow.spend, impressions: vm.totalsRow.impressions, clicks: vm.totalsRow.clicks, ctr: vm.totalsRow.ctr }
                : undefined
            }
          />
          <p className="table-note">
            Reach shows <strong>—</strong> for any range longer than one day. Meta de-duplicates reach, so daily figures
            cannot be summed without over-counting people seen more than once; this build has no live API to ask for a
            range-level figure. Select a single day to see real reach.
          </p>

          <h2 className="section-title">Spend by country</h2>
          <div className="split-grid">
            <div style={{ flex: 1 }}>
              <DonutChart
                data={(vm.countryBreakdown ?? []).map((c, i) => ({
                  name: c.country,
                  value: c.spend,
                  color: COUNTRY_DONUT_COLORS[i % COUNTRY_DONUT_COLORS.length],
                }))}
              />
            </div>
            <div style={{ flex: 2 }}>
              {(vm.countryBreakdown ?? []).map((c) => (
                <BarRow
                  key={c.country}
                  label={c.country}
                  value={`${c.spendDisplay} (${c.percentOfBudgetDisplay})`}
                  sharePercent={Number.parseFloat(c.percentOfBudgetDisplay)}
                  color="var(--accent-1)"
                />
              ))}
            </div>
          </div>

          <h2 className="section-title">Conversations by ad set</h2>
          <HorizontalBarChart
            data={(vm.conversationsByAdSet ?? []).map((d) => ({ name: d.name, value: d.value, color: 'var(--accent-1)' }))}
          />

          <h2 className="section-title">Cost per conversation by ad set</h2>
          <p>Account average: {vm.accountAverageCostPerConv !== null ? `₹${vm.accountAverageCostPerConv.toFixed(2)}` : '—'}</p>
          <HorizontalBarChart
            data={(vm.costPerConvByAdSet ?? []).map((d) => ({ name: d.name, value: d.value ?? 0, color: 'var(--hue-yellow)' }))}
          />

          <h2 className="section-title">Account opportunity score</h2>
          <div className="panel">
            <strong>{vm.opportunityScore ?? '—'}/100</strong>
            <p>Rule-based performance suggestions and optimization flags.</p>
          </div>

          <NarrativeBlock flags={vm.narrativeFlags} />
          <ActionList flags={vm.narrativeFlags} />
        </>
      )}
    </div>
  )
}
