import { load, loadConfig } from '@/data/loader'
import { AreaTrendChart } from '@/components/data/AreaTrendChart'
import { CardSkeleton } from '@/components/data/CardSkeleton'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { KpiCard } from '@/components/data/KpiCard'
import { CoverageState } from '@/components/states/CoverageState'
import { NotConnectedPanel } from '@/components/states/NotConnectedPanel'
import {
  buildSeoViewModel,
  type CountryRow,
  type DeviceRow,
  type PageRow,
  type QueryRow,
  type ZeroClickRow,
} from '@/viewmodels/seo'
import { useMetricsQuery } from './useMetricsQuery'
import { useRangeState } from './useRangeState'

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

const CLICK_QUERY_COLUMNS: DataTableColumn<QueryRow>[] = [
  { key: 'query', label: 'Search query', accessor: (r) => r.query },
  {
    key: 'type',
    label: 'Brand classification',
    accessor: (r) => r.typeLabel,
    render: (r) => (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          background: r.isBrand ? 'var(--surface-2)' : 'var(--surface-1)',
          color: r.isBrand ? 'var(--hue-blue)' : 'var(--text-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {r.typeLabel}
      </span>
    ),
  },
  { key: 'clicks', label: 'Clicks', accessor: (r) => r.clicks, render: (r) => r.clicksDisplay, align: 'right' },
  { key: 'impressions', label: 'Impressions', accessor: (r) => r.impressions, render: (r) => r.impressionsDisplay, align: 'right' },
  { key: 'ctr', label: 'CTR', accessor: (r) => r.ctrDisplay, align: 'right' },
  { key: 'avgPosition', label: 'Avg. position', accessor: (r) => r.avgPosition, render: (r) => r.avgPositionDisplay, align: 'right' },
]

const ZERO_CLICK_COLUMNS: DataTableColumn<ZeroClickRow>[] = [
  { key: 'query', label: 'Target keyword', accessor: (r) => r.query },
  { key: 'impressions', label: 'Impressions', accessor: (r) => r.impressions, render: (r) => r.impressionsDisplay, align: 'right' },
  { key: 'avgPosition', label: 'Current position', accessor: (r) => r.avgPosition, render: (r) => `#${r.avgPositionDisplay}`, align: 'right' },
  { key: 'gap', label: 'Gap to Page 1', accessor: (r) => r.gapToPage1, render: (r) => r.gapToPage1Display, align: 'right' },
  {
    key: 'priority',
    label: 'Action priority',
    accessor: (r) => r.priority,
    render: (r) => {
      const color =
        r.priority === 'Critical'
          ? 'var(--hue-red)'
          : r.priority === 'High'
            ? 'var(--hue-yellow)'
            : 'var(--text-muted)'
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: 'var(--surface-2)',
            color,
            border: `1px solid ${color}`,
          }}
        >
          {r.priority}
        </span>
      )
    },
  },
]

const PAGE_COLUMNS: DataTableColumn<PageRow>[] = [
  { key: 'page', label: 'Page path', accessor: (r) => r.page },
  { key: 'clicks', label: 'Clicks', accessor: (r) => r.clicks, render: (r) => r.clicksDisplay, align: 'right' },
  { key: 'impressions', label: 'Impressions', accessor: (r) => r.impressions, render: (r) => r.impressionsDisplay, align: 'right' },
  { key: 'ctr', label: 'CTR', accessor: (r) => r.ctrDisplay, align: 'right' },
  { key: 'avgPosition', label: 'Avg. position', accessor: (r) => r.avgPositionDisplay, align: 'right' },
]

const COUNTRY_COLUMNS: DataTableColumn<CountryRow>[] = [
  { key: 'country', label: 'Country code', accessor: (r) => r.country },
  { key: 'clicks', label: 'Clicks', accessor: (r) => r.clicks, render: (r) => r.clicksDisplay, align: 'right' },
  { key: 'impressions', label: 'Impressions', accessor: (r) => r.impressions, render: (r) => r.impressionsDisplay, align: 'right' },
  { key: 'ctr', label: 'CTR', accessor: (r) => r.ctrDisplay, align: 'right' },
  { key: 'avgPosition', label: 'Avg. position', accessor: (r) => r.avgPositionDisplay, align: 'right' },
]

const DEVICE_COLUMNS: DataTableColumn<DeviceRow>[] = [
  { key: 'device', label: 'Device', accessor: (r) => r.device },
  { key: 'clicks', label: 'Clicks', accessor: (r) => r.clicks, render: (r) => r.clicksDisplay, align: 'right' },
  { key: 'clickShare', label: 'Click share', accessor: (r) => r.clickShareDisplay, align: 'right' },
  { key: 'impressions', label: 'Impressions', accessor: (r) => r.impressions, render: (r) => r.impressionsDisplay, align: 'right' },
  { key: 'ctr', label: 'CTR', accessor: (r) => r.ctrDisplay, align: 'right' },
  { key: 'avgPosition', label: 'Avg. position', accessor: (r) => r.avgPositionDisplay, align: 'right' },
]

/**
 * SEO tab — Google Search Console organic search performance (items 3.26-3.33). BRD §9.
 */
export default function SeoPage() {
  const { range, comparisonRange } = useRangeState()

  const { data: vm, isLoading } = useMetricsQuery('seo', range, comparisonRange, async () => {
    const [file, brandTermsConfig] = await Promise.all([load('gsc'), loadConfig('brand-terms')])
    return buildSeoViewModel(file, range, brandTermsConfig.terms)
  })

  return (
    <div>
      <h1>SEO</h1>
      <p>Google Search Console · Organic Search Performance</p>

      {/* Item 3.29 — DataAsOfBanner reading latestRecordDate */}
      {vm && (
        <div
          role="note"
          aria-label="Data freshness notice"
          style={{
            padding: '8px 14px',
            borderRadius: 6,
            background: 'var(--surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          Data as of {vm.dataAsOfDate} (standard 2–3 day Search Console reporting lag)
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} height={80} />
          ))}
        </div>
      )}

      {!isLoading && vm && !vm.hasData && <CoverageState coverage={vm.coverage} />}

      {!isLoading && vm && vm.hasData && (
        <>
          <h2>Overview — {range.from} to {range.to}</h2>
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

          <h2>Daily clicks trend</h2>
          <AreaTrendChart
            data={(vm.dailyTrend ?? []).map((d) => ({ date: d.date, value: d.clicks }))}
            ariaLabel="Daily search clicks area chart"
            color="var(--accent-3)"
          />

          <h2>Click-generating queries</h2>
          <DataTable
            columns={CLICK_QUERY_COLUMNS}
            rows={vm.clickQueries ?? []}
            getRowKey={(r) => r.query}
          />

          <h2>High-impression zero-click keywords (Optimization opportunities)</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Keywords generating impressions where TechnoRUCS currently earns 0 clicks. Prioritized by search volume and distance from Page 1.
          </p>
          <DataTable
            columns={ZERO_CLICK_COLUMNS}
            rows={vm.zeroClickQueries ?? []}
            getRowKey={(r) => r.query}
          />

          <h2>Top indexed pages by organic traffic</h2>
          <DataTable
            columns={PAGE_COLUMNS}
            rows={(vm.topPages ?? []).slice(0, 10)}
            getRowKey={(r) => r.page}
          />

          <h2>Geographic & device breakdown</h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 340px' }}>
              <h3>Search clicks by country</h3>
              <DataTable
                columns={COUNTRY_COLUMNS}
                rows={(vm.countries ?? []).slice(0, 8)}
                getRowKey={(r) => r.country}
              />
            </div>
            <div style={{ flex: '1 1 340px' }}>
              <h3>Performance by device</h3>
              <DataTable
                columns={DEVICE_COLUMNS}
                rows={vm.devices ?? []}
                getRowKey={(r) => r.device}
              />
            </div>
          </div>

          <h2>Backlink profile</h2>
          <NotConnectedPanel message="Ubersuggest backlinks integration is not connected. Track backlinks in Ubersuggest directly (BRD §9.3)." />
        </>
      )}
    </div>
  )
}
