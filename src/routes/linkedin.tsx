import type { CSSProperties } from 'react'
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
  buildLinkedInViewModel,
  type CompetitorRow,
  type PostPerformanceRow,
} from '@/viewmodels/linkedin'
import { useMetricsQuery } from './useMetricsQuery'
import { useRangeState } from './useRangeState'
import { useChannelMeta } from './useChannelMeta'

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

const COMPETITOR_COLUMNS: DataTableColumn<CompetitorRow>[] = [
  {
    key: 'page',
    label: 'Company page',
    accessor: (r) => r.page,
    render: (r) => (
      <span style={{ fontWeight: r.isSelf ? 700 : 400, color: r.isSelf ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
        {r.page} {r.isSelf ? ' (TechnoRUCS)' : ''}
      </span>
    ),
  },
  { key: 'newFollowers', label: 'New followers', accessor: (r) => r.newFollowers, render: (r) => r.newFollowersDisplay, align: 'right' },
  { key: 'posts', label: 'Posts published', accessor: (r) => r.posts, render: (r) => r.postsDisplay, align: 'right' },
  { key: 'comments', label: 'Comments', accessor: (r) => r.comments, render: (r) => r.commentsDisplay, align: 'right' },
  { key: 'reactions', label: 'Reactions', accessor: (r) => r.reactions, render: (r) => r.reactionsDisplay, align: 'right' },
  { key: 'reactionsPerPost', label: 'Reactions / post', accessor: (r) => Number.parseFloat(r.reactionsPerPostDisplay) || 0, render: (r) => r.reactionsPerPostDisplay, align: 'right' },
  {
    key: 'verdict',
    label: 'Benchmark verdict',
    accessor: (r) => r.verdict,
    render: (r) => {
      const isLead = r.verdict === 'Leading'
      const color = isLead ? 'var(--hue-green)' : 'var(--hue-yellow)'
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            background: 'var(--color-surface-2)',
            color,
            border: `1px solid ${color}`,
          }}
        >
          {r.verdict}
        </span>
      )
    },
  },
]

const POST_COLUMNS: DataTableColumn<PostPerformanceRow>[] = [
  { key: 'date', label: 'Date', accessor: (r) => r.date },
  {
    key: 'title',
    label: 'Post title / preview',
    accessor: (r) => r.title,
    render: (r) => (
      <span style={{ maxWidth: 280, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {r.title}
      </span>
    ),
  },
  { key: 'impressions', label: 'Impressions', accessor: (r) => r.impressions, render: (r) => r.impressionsDisplay, align: 'right' },
  { key: 'clicks', label: 'Clicks', accessor: (r) => r.clicks, render: (r) => r.clicksDisplay, align: 'right' },
  { key: 'reactions', label: 'Reactions', accessor: (r) => r.reactions, render: (r) => r.reactionsDisplay, align: 'right' },
  { key: 'comments', label: 'Comments', accessor: (r) => r.comments, render: (r) => r.commentsDisplay, align: 'right' },
  { key: 'engagementRate', label: 'Eng. rate', accessor: (r) => r.engagementRateDisplay, align: 'right' },
  { key: 'ctr', label: 'CTR', accessor: (r) => r.ctrDisplay, align: 'right' },
  { key: 'videoViews', label: 'Video views', accessor: (r) => r.videoViewsDisplay, align: 'right' },
]

/**
 * LinkedIn tab — Organic page analytics & post performance (items 3.35-3.40). BRD §11.
 */
export default function LinkedInPage() {
  const { range, comparisonRange } = useRangeState()
  const syncMeta = useChannelMeta('linkedin')

  const { data: vm, isLoading } = useMetricsQuery('linkedin', range, comparisonRange, async () => {
    const [file, competitorsConfig, narratives] = await Promise.all([
      load('linkedin'),
      loadConfig('linkedin-competitors'),
      load('narratives').catch(() => null),
    ])
    return buildLinkedInViewModel(file, range, competitorsConfig, narratives)
  })

  return (
    <div className="page" style={{ '--page-accent': 'var(--accent-7)' } as CSSProperties}>
      <h1 className="page-title">LinkedIn</h1>
      <div className="page-subtitle">
        <p style={{ margin: 0 }}>Organic Social Analytics · TechnoRUCS Company Page</p>
        <LastSyncedBadge channel="linkedin" metaEnvelope={syncMeta} />
      </div>

      {isLoading && (
        <div className="kpi-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} height={80} />
          ))}
        </div>
      )}

      {!isLoading && vm && !vm.hasData && <CoverageState coverage={vm.coverage} />}

      {!isLoading && vm && vm.hasData && (
        <>
          <h2 className="section-title">Page performance overview — {range.from} to {range.to}</h2>
          <div className="kpi-grid">
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

          <h2 className="section-title">Competitor engagement benchmark</h2>
          <DataTable
            columns={COMPETITOR_COLUMNS}
            rows={vm.competitorTable ?? []}
            getRowKey={(r) => r.page}
          />

          <h2 className="section-title">Daily engagement trends</h2>
          <div className="split-grid">
            <div style={{ flex: '1 1 340px' }}>
              <h3 className="subsection-title">Daily impressions</h3>
              <AreaTrendChart
                data={(vm.dailyTrends ?? []).map((d) => ({ date: d.date, value: d.impressions }))}
                ariaLabel="Daily impressions area chart"
                color="var(--accent-1)"
              />
            </div>
            <div style={{ flex: '1 1 340px' }}>
              <h3 className="subsection-title">Daily new followers</h3>
              <AreaTrendChart
                data={(vm.dailyTrends ?? []).map((d) => ({ date: d.date, value: d.newFollowers }))}
                ariaLabel="Daily new followers area chart"
                color="var(--accent-4)"
              />
            </div>
          </div>

          <h2 className="section-title">Published posts performance</h2>
          <DataTable
            columns={POST_COLUMNS}
            rows={vm.posts ?? []}
            getRowKey={(r) => r.postId}
          />

          {vm.audience && (
            <>
              <h2 className="section-title">Audience & visitor demographics</h2>
              <div className="split-grid">
                <div style={{ flex: '1 1 280px' }}>
                  <h3 className="subsection-title">Followers by seniority</h3>
                  {vm.audience.seniority.map((s) => (
                    <BarRow
                      key={s.label}
                      label={s.label}
                      value={`${s.countDisplay} (${s.shareDisplay})`}
                      sharePercent={s.sharePercent}
                      color="var(--accent-1)"
                    />
                  ))}
                </div>
                <div style={{ flex: '1 1 280px' }}>
                  <h3 className="subsection-title">Followers by job function</h3>
                  {vm.audience.jobFunction.map((j) => (
                    <BarRow
                      key={j.label}
                      label={j.label}
                      value={`${j.countDisplay} (${j.shareDisplay})`}
                      sharePercent={j.sharePercent}
                      color="var(--accent-2)"
                    />
                  ))}
                </div>
                <div style={{ flex: '1 1 280px' }}>
                  <h3 className="subsection-title">Visitors by industry</h3>
                  {vm.audience.visitorIndustry.map((v) => (
                    <BarRow
                      key={v.label}
                      label={v.label}
                      value={`${v.countDisplay} (${v.shareDisplay})`}
                      sharePercent={v.sharePercent}
                      color="var(--accent-3)"
                    />
                  ))}
                </div>
                <div style={{ flex: '1 1 280px' }}>
                  <h3 className="subsection-title">Visitors by company size</h3>
                  {vm.audience.companySize.map((c) => (
                    <BarRow
                      key={c.label}
                      label={c.label}
                      value={`${c.countDisplay} (${c.shareDisplay})`}
                      sharePercent={c.sharePercent}
                      color="var(--accent-5)"
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <NarrativeBlock flags={vm.narrativeFlags} />
          <ActionList flags={vm.narrativeFlags} />
        </>
      )}
    </div>
  )
}
