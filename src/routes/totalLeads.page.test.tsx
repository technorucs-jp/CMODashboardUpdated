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

const { default: TotalLeadsPage } = await import('./totalLeads')

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <TotalLeadsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TotalLeadsPage — end-to-end against real Meta Ads fixture (items 3.41-3.44)', () => {
  it('renders labelled fallback comparison notice when unset (item 3.41)', async () => {
    renderAt('/total-leads?from=2026-06-01&to=2026-06-30')

    await waitFor(() =>
      expect(screen.getByText(/Comparing to previous period/)).toBeInTheDocument(),
    )
    expect(screen.getByText(/2026-05-02 to 2026-05-31/)).toBeInTheDocument()
  })

  it('renders headline comparison figures (item 3.42; Wireframe/10-totalleads-top.jpg)', async () => {
    renderAt('/total-leads?from=2026-06-01&to=2026-06-30&cf=2026-05-01&ct=2026-05-31')

    await waitFor(() => expect(screen.getAllByText('101').length).toBeGreaterThan(0))
    expect(screen.getAllByText(/178/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('₹380.43').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/176\.26/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('₹38,423.31').length).toBeGreaterThan(0)
  })

  it('renders campaign breakdown table and account totals (item 3.43)', async () => {
    renderAt('/total-leads?from=2026-06-01&to=2026-06-30&cf=2026-05-01&ct=2026-05-31')

    await waitFor(() => expect(screen.getByText('Campaign breakdown & totals per period')).toBeInTheDocument())
    expect(screen.getByText(/Account Totals:/)).toBeInTheDocument()
  })

  it('out of range shows coverage state (P4)', async () => {
    renderAt('/total-leads?from=2026-04-01&to=2026-04-30')

    await waitFor(() =>
      expect(screen.getByText(/No data before 2026-05-01/)).toBeInTheDocument(),
    )
  })
})
