import { load, loadConfig } from '@/data/loader'
import { AreaTrendChart } from '@/components/data/AreaTrendChart'
import { BarRow } from '@/components/data/BarRow'
import { CardSkeleton } from '@/components/data/CardSkeleton'
import { DataTable, type DataTableColumn } from '@/components/data/DataTable'
import { KpiCard } from '@/components/data/KpiCard'
import { LastSyncedBadge } from '@/components/data/LastSyncedBadge'
import { NarrativeBlock } from '@/components/narrative/NarrativeBlock'
import { ActionList } from '@/components/narrative/ActionList'
import { CoverageState } from '@/components/states/CoverageState'
import {
  buildWebsiteViewModel,
  type ChannelRow,
  type CountryRow,
  type DeviceRow,
  type PageRow,
  type PathRow,
  type SourceRow,
} from '@/viewmodels/website'
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

const SOURCE_COLUMNS: DataTableColumn<SourceRow>[] = [
  { key: 'source', label: 'Source', accessor: (r) => r.source },
  { key: 'channelGroup', label: 'Channel group', accessor: (r) => r.channelGroup },
  { key: 'sessions', label: 'Sessions', accessor: (r) => r.sessions, render: (r) => r.sessionsDisplay, align: 'right' },
  { key: 'engaged', label: 'Engaged sessions', accessor: (r) => r.engagedDisplay, align: 'right' },
  { key: 'bounceRate', label: 'Bounce rate', accessor: (r) => r.bounceRateDisplay, align: 'right' },
]

const PAGE_COLUMNS: DataTableColumn<PageRow>[] = [
  { key: 'pagePath', label: 'Page path', accessor: (r) => r.pagePath },
  {
    key: 'pageType',
    label: 'Page type',
    accessor: (r) => r.pageType,
    render: (r) => (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
          background: 'var(--surface-2)',
          color: 'var(--text-primary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {r.pageType}
      </span>
    ),
  },
  { key: 'views', label: 'Page views', accessor: (r) => r.views, render: (r) => r.viewsDisplay, align: 'right' },
  { key: 'users', label: 'Users', accessor: (r) => r.usersDisplay, align: 'right' },
  { key: 'engaged', label: 'Engaged', accessor: (r) => r.engagedDisplay, align: 'right' },
  { key: 'bounceRate', label: 'Bounce rate', accessor: (r) => r.bounceRateDisplay, align: 'right' },
  { key: 'avgDuration', label: 'Avg duration', accessor: (r) => r.avgDurationDisplay, align: 'right' },
]

const COUNTRY_COLUMNS: DataTableColumn<CountryRow>[] = [
  { key: 'country', label: 'Country code', accessor: (r) => r.country },
  { key: 'users', label: 'Users', accessor: (r) => r.users, render: (r) => r.usersDisplay, align: 'right' },
  { key: 'bounceRate', label: 'Bounce rate', accessor: (r) => r.bounceRateDisplay, align: 'right' },
  { key: 'avgDuration', label: 'Avg duration', accessor: (r) => r.avgDurationDisplay, align: 'right' },
]

const DEVICE_COLUMNS: DataTableColumn<DeviceRow>[] = [
  { key: 'device', label: 'Device category', accessor: (r) => r.device },
  { key: 'sessions', label: 'Sessions', accessor: (r) => r.sessions, render: (r) => r.sessionsDisplay, align: 'right' },
  { key: 'engagementRate', label: 'Engagement rate', accessor: (r) => r.engagementRateDisplay, align: 'right' },
  { key: 'engagedOfSessions', label: 'Engaged sessions', accessor: (r) => r.engagedOfSessionsDisplay, align: 'right' },
]

const PATH_COLUMNS: DataTableColumn<PathRow>[] = [
  { key: 'step1', label: 'Step 1 (Starting page)', accessor: (r) => r.step1 },
  { key: 'step2', label: 'Step 2 (Next page / Exit)', accessor: (r) => r.step2 },
  { key: 'sessions', label: 'Sessions', accessor: (r) => r.sessions, render: (r) => r.sessionsDisplay, align: 'right' },
]

/**
 * Website tab — GA4 web performance metrics (items 3.17-3.25). BRD §8.
 */
export default function WebsitePage() {
  const { range, comparisonRange } = useRangeState()

  const { data: vm, isLoading } = useMetricsQuery('website', range, comparisonRange, async () => {
    const [file, pageTypesConfig, metaFile, narratives] = await Promise.all([
      load('ga4'),
      loadConfig('page-types'),
      load('meta-ads').catch(() => null),
      load('narratives').catch(() => null),
    ])
    return buildWebsiteViewModel(file, range, pageTypesConfig, metaFile, narratives)
  })

  return (
    <div>
      <h1>Website</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <p style={{ margin: 0 }}>Google Analytics 4 · technorucs.com</p>
        <LastSyncedBadge channel="ga4" />
      </div>

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

          <h2>Daily sessions trend</h2>
          <AreaTrendChart
            data={(vm.dailySessions ?? []).map((d) => ({ date: d.date, value: d.sessions }))}
            ariaLabel="Daily sessions area chart"
            color="var(--accent-1)"
          />

          <h2>Traffic channels breakdown & quality</h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 340px' }}>
              <h3>Sessions by channel group</h3>
              {vm.channelBreakdown!.map((c: ChannelRow) => (
                <BarRow
                  key={c.channelGroup}
                  label={c.channelGroup}
                  value={`${c.sessionsDisplay} (${c.shareDisplay})`}
                  sharePercent={c.sharePercent}
                  color="var(--accent-1)"
                />
              ))}
            </div>
            <div style={{ flex: '1 1 340px' }}>
              <h3>Channel engagement & bounce quality</h3>
              {vm.channelBreakdown!.map((c: ChannelRow) => (
                <div key={c.channelGroup} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{c.channelGroup}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Eng: {c.engagementRateDisplay} · Bounce: {c.bounceRateDisplay}
                    </span>
                  </div>
                  <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-2)' }}>
                    <div
                      style={{
                        width: `${c.engagementRatePercent}%`,
                        background: 'var(--hue-green)',
                      }}
                    />
                    <div
                      style={{
                        width: `${c.bounceRatePercent}%`,
                        background: 'var(--hue-red)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h2>Top traffic sources</h2>
          <DataTable
            columns={SOURCE_COLUMNS}
            rows={vm.topSources ?? []}
            getRowKey={(r) => `${r.channelGroup}-${r.source}`}
          />

          <h2>AI Assistant Referral Insight</h2>
          <div
            className="card"
            style={{
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'var(--surface-1)',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>AI Referral Sessions</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-1)' }}>
                  {vm.aiReferral?.sessionsDisplay ?? '0'}
                </div>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>AI Engagement Rate</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {vm.aiReferral?.engagementRateDisplay ?? '—'}{' '}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    (vs {vm.aiReferral?.siteEngagementRateDisplay ?? '—'} site avg)
                  </span>
                </div>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>AI Bounce Rate</div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {vm.aiReferral?.bounceRateDisplay ?? '—'}{' '}
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    (vs {vm.aiReferral?.siteBounceRateDisplay ?? '—'} site avg)
                  </span>
                </div>
              </div>
            </div>
            {vm.aiReferral && vm.aiReferral.sources.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Identified AI engines:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {vm.aiReferral.sources.map((s) => (
                    <span
                      key={s.source}
                      style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {s.source}: {s.sessionsDisplay} sessions ({s.bounceRateDisplay} bounce)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <h2>Top pages & content classification</h2>
          <DataTable
            columns={PAGE_COLUMNS}
            rows={vm.topPages ?? []}
            getRowKey={(r) => r.pagePath}
          />

          <h2>Entry behaviour & country quality</h2>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 340px' }}>
              <h3>Top landing pages (entry points)</h3>
              {(vm.landingPages ?? []).slice(0, 7).map((lp) => (
                <BarRow
                  key={lp.landingPage}
                  label={lp.landingPage}
                  value={`${lp.sessionsDisplay} (${lp.bounceRateDisplay} bounce)`}
                  sharePercent={lp.sharePercent}
                  color="var(--accent-2)"
                />
              ))}
            </div>
            <div style={{ flex: '1 1 340px' }}>
              <h3>Device breakdown</h3>
              <DataTable
                columns={DEVICE_COLUMNS}
                rows={vm.devices ?? []}
                getRowKey={(r) => r.device}
              />
            </div>
          </div>

          <h2>Top countries reached</h2>
          <DataTable
            columns={COUNTRY_COLUMNS}
            rows={(vm.countries ?? []).slice(0, 10)}
            getRowKey={(r) => r.country}
          />

          <h2>User journey — path exploration</h2>
          {vm.paths && vm.paths.length > 0 ? (
            <DataTable
              columns={PATH_COLUMNS}
              rows={vm.paths}
              getRowKey={(r) => `${r.step1}->${r.step2}`}
            />
          ) : (
            <div className="card" style={{ padding: 16 }} role="status">
              <p>No multi-step journey paths recorded for this date range.</p>
            </div>
          )}

          <NarrativeBlock flags={vm.narrativeFlags} />
          <ActionList flags={vm.narrativeFlags} />
        </>
      )}
    </div>
  )
}
