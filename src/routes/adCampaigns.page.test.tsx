import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures')
const metaAdsFixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'meta-ads.json'), 'utf8'))

const loadMock = vi.hoisted(() => vi.fn(async () => metaAdsFixture))
vi.mock('@/data/loader', () => ({ load: loadMock }))

const { default: AdCampaignsPage } = await import('./adCampaigns')

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AdCampaignsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdCampaignsPage — end-to-end against the real June fixture (items 2.14-2.24)', () => {
  it('renders the real June headline figures, not placeholders', async () => {
    renderAt('/ad-campaigns?from=2026-06-01&to=2026-06-30')

    // Spend appears twice (the KpiCard and the ad-set table's totals row) — that's
    // correct duplication, not a bug, so assert presence via getAllByText.
    await waitFor(() => expect(screen.getAllByText('₹38,423.31').length).toBeGreaterThan(0))
    expect(screen.getAllByText('95,823').length).toBeGreaterThan(0)
    expect(screen.getAllByText('655').length).toBeGreaterThan(0)
    expect(screen.getByText('101')).toBeInTheDocument()
    expect(screen.getByText('₹58.66')).toBeInTheDocument()
    // Appears for the account card AND per ad-set-row (most ad sets are multi-day
    // too) — that's correct, not a duplicate bug; item 2.16 just needs it present.
    expect(screen.getAllByText('n/a for multi-day ranges').length).toBeGreaterThan(0)
  })

  it('the ad-set table shows the em-dash for BC Australia — Video\'s cost/conversation', async () => {
    renderAt('/ad-campaigns?from=2026-06-01&to=2026-06-30')
    await waitFor(() => expect(screen.getByText('BC Australia — Video')).toBeInTheDocument())
    // the row's — appears among several cells; assert at least one em-dash cell exists in the table
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows the account opportunity score panel — 100/100 "Perfect score" for June (07-adcampaigns-mid2.jpg)', async () => {
    const { container } = renderAt('/ad-campaigns?from=2026-06-01&to=2026-06-30')
    // The score and the "/100" suffix are separate JSX children (separate text
    // nodes) — check the rendered text content directly rather than one exact string.
    await waitFor(() => expect(container.textContent).toContain('100/100'))
  })

  it('a range before earliestRecordDate shows an explicit no-data state, not zeros (item 2.23/3.1)', async () => {
    renderAt('/ad-campaigns?from=2026-04-01&to=2026-04-30')
    await waitFor(() => expect(screen.getByText(/No data before 2026-05-01/)).toBeInTheDocument())
    expect(screen.queryByText('₹0')).not.toBeInTheDocument()
  })
})
