import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LastSyncedBadge } from './LastSyncedBadge'
import { isoInstantHoursAgo } from '@/lib/time/businessDate'

describe('LastSyncedBadge (items 5.13, 5.14; TAD §8.1)', () => {
  it('renders neutral/fresh badge for recent sync', () => {
    const recentIso = isoInstantHoursAgo(2)
    render(
      <LastSyncedBadge
        channel="meta-ads"
        metaEnvelope={{
          meta: {
            lastSyncedAt: recentIso,
            latestRecordDate: '2026-08-14',
            rowCounts: { facts: 50 },
          },
        }}
      />,
    )

    const badge = screen.getByRole('status')
    expect(badge).toHaveTextContent(/Synced/i)
    expect(badge.getAttribute('title')).toContain('IST')
  })

  it('renders amber/delayed badge when sync is delayed', () => {
    const delayedIso = isoInstantHoursAgo(55)
    render(
      <LastSyncedBadge
        channel="meta-ads"
        metaEnvelope={{
          meta: {
            lastSyncedAt: delayedIso,
            latestRecordDate: '2026-08-11',
          },
        }}
      />,
    )

    const badge = screen.getByRole('status')
    expect(badge).toHaveTextContent(/delayed/i)
  })

  it('renders red/stale badge when sync is severely overdue', () => {
    const staleIso = isoInstantHoursAgo(120)
    render(
      <LastSyncedBadge
        channel="meta-ads"
        metaEnvelope={{
          meta: {
            lastSyncedAt: staleIso,
            latestRecordDate: '2026-08-01',
          },
        }}
      />,
    )

    const badge = screen.getByRole('status')
    expect(badge).toHaveTextContent(/Stale/i)
  })
})
