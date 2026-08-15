import type { CSSProperties } from 'react'
import { load, loadConfig } from '@/data/loader'
import { CardSkeleton } from '@/components/data/CardSkeleton'
import { KpiCard } from '@/components/data/KpiCard'
import { StatusTag } from '@/components/data/StatusTag'
import { LastSyncedBadge } from '@/components/data/LastSyncedBadge'
import { NarrativeBlock } from '@/components/narrative/NarrativeBlock'
import { ActionList } from '@/components/narrative/ActionList'
import { buildOverviewViewModel } from '@/viewmodels/overview'
import { useMetricsQuery } from './useMetricsQuery'
import { useRangeState } from './useRangeState'
import { useChannelMeta } from './useChannelMeta'

/**
 * The Overview tab (items 3.2-3.6) — the executive summary, reading all five
 * channels at once. See `src/viewmodels/overview.ts`'s header comment for two
 * load-bearing deviations from the wireframe this tab's numbers will show:
 * LinkedIn's May comparison is a genuine coverage gap (no real May upload
 * exists), and two of the five channel-health status tags diverge from the
 * wireframe's hand-assigned labels because this build uses the same
 * mechanical, already-tested threshold engine every other status tag uses.
 */
export default function OverviewPage() {
  const { range, comparisonRange } = useRangeState()
  const syncMeta = useChannelMeta('meta-ads')

  const { data: vm, isLoading } = useMetricsQuery('overview', range, comparisonRange, async () => {
    const [metaAds, ga4, gsc, linkedin, zoho, thresholds, brandTermsConfig, narratives] = await Promise.all([
      load('meta-ads'),
      load('ga4'),
      load('gsc'),
      load('linkedin'),
      load('zoho-crm'),
      loadConfig('thresholds'),
      loadConfig('brand-terms'),
      load('narratives').catch(() => null),
    ])
    return buildOverviewViewModel(
      { metaAds, ga4, gsc, linkedin, zoho },
      range,
      comparisonRange,
      thresholds,
      brandTermsConfig.terms,
      narratives,
    )
  })

  return (
    <div className="page" style={{ '--page-accent': 'var(--accent-1)' } as CSSProperties}>
      <h1 className="page-title">Overview</h1>
      <div className="page-subtitle">
        <p style={{ margin: 0 }}>
          All channels · {range.from} to {range.to}
        </p>
        <LastSyncedBadge channel="meta-ads" metaEnvelope={syncMeta} />
      </div>

      {isLoading && (
        <div className="kpi-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} height={80} />
          ))}
        </div>
      )}

      {!isLoading && vm && (
        <>
          <div className="kpi-grid">
            {vm.kpiCards.map((card) => (
              <KpiCard key={card.label} label={card.label} value={card.value} detail={card.detail} accent={card.accent} />
            ))}
          </div>

          <h2 className="section-title">Channel health — {vm.comparisonLabel}</h2>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Source</th>
                  <th>Key metric</th>
                  <th className="num">Value</th>
                  <th className="num">{vm.comparisonLabel}</th>
                  <th className="num">Status</th>
                </tr>
              </thead>
              <tbody>
                {vm.channelHealth.map((row) => (
                  <tr key={row.channel}>
                    <td>{row.channel}</td>
                    <td>{row.source}</td>
                    <td>{row.keyMetric}</td>
                    <td className="num">{row.value}</td>
                    <td className="num">{row.changeDisplay}</td>
                    <td className="num">{row.status ? <StatusTag status={row.status} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="section-title">Period comparison — {vm.comparisonLabel}</h2>
          <div className="split-grid">
            {vm.periodComparisonBlocks.map((b) => (
              <div key={b.title} className="panel">
                <h3 style={{ marginTop: 0, textTransform: 'uppercase', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {b.title}
                </h3>
                <table className="data-table">
                  <tbody>
                    {b.rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td className="num">
                          {row.comparisonDisplay}
                          {' → '}
                          {row.currentDisplay}
                        </td>
                        <td className="num">{row.changeDisplay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <NarrativeBlock flags={vm.narrativeFlags} />
          <ActionList flags={vm.narrativeFlags} />
        </>
      )}
    </div>
  )
}
