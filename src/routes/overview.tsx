import { load, loadConfig } from '@/data/loader'
import { CardSkeleton } from '@/components/data/CardSkeleton'
import { KpiCard } from '@/components/data/KpiCard'
import { StatusTag } from '@/components/data/StatusTag'
import { NarrativeBlock } from '@/components/narrative/NarrativeBlock'
import { ActionList } from '@/components/narrative/ActionList'
import { buildOverviewViewModel } from '@/viewmodels/overview'
import { useMetricsQuery } from './useMetricsQuery'
import { useRangeState } from './useRangeState'

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
    <div>
      <h1>Overview</h1>
      <p>
        All channels · {range.from} to {range.to}
      </p>

      {isLoading && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} height={80} />
          ))}
        </div>
      )}

      {!isLoading && vm && (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {vm.kpiCards.map((card) => (
              <KpiCard key={card.label} label={card.label} value={card.value} detail={card.detail} accent={card.accent} />
            ))}
          </div>

          <h2>Channel health — {vm.comparisonLabel}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Channel</th>
                  <th style={{ textAlign: 'left' }}>Source</th>
                  <th style={{ textAlign: 'left' }}>Key metric</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                  <th style={{ textAlign: 'right' }}>{vm.comparisonLabel}</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {vm.channelHealth.map((row) => (
                  <tr key={row.channel}>
                    <td>{row.channel}</td>
                    <td>{row.source}</td>
                    <td>{row.keyMetric}</td>
                    <td style={{ textAlign: 'right' }}>{row.value}</td>
                    <td style={{ textAlign: 'right' }}>{row.changeDisplay}</td>
                    <td style={{ textAlign: 'right' }}>{row.status ? <StatusTag status={row.status} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Period comparison — {vm.comparisonLabel}</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {vm.periodComparisonBlocks.map((b) => (
              <div key={b.title} className="card" style={{ flex: '1 1 300px', padding: 16 }}>
                <h3 style={{ marginTop: 0, textTransform: 'uppercase', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {b.title}
                </h3>
                <table style={{ width: '100%', fontVariantNumeric: 'tabular-nums' }}>
                  <tbody>
                    {b.rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td style={{ textAlign: 'right' }}>
                          {row.comparisonDisplay}
                          {' → '}
                          {row.currentDisplay}
                        </td>
                        <td style={{ textAlign: 'right' }}>{row.changeDisplay}</td>
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
