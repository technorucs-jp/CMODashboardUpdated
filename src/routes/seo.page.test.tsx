import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures')
const CONFIG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'config')

const gscFixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'gsc.json'), 'utf8'))
const brandTermsConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'brand-terms.json'), 'utf8'))

const narrativesFixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'narratives.json'), 'utf8'))

const loadMock = vi.hoisted(() =>
  vi.fn(async (ch: string) => {
    if (ch === 'gsc') return gscFixture
    if (ch === 'narratives') return narrativesFixture
    return null
  }),
)
const loadConfigMock = vi.hoisted(() => vi.fn(async () => brandTermsConfig))
vi.mock('@/data/loader', () => ({ load: loadMock, loadConfig: loadConfigMock }))

const { default: SeoPage } = await import('./seo')

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <SeoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SeoPage — end-to-end against real GSC fixture (items 3.26-3.33)', () => {
  it('renders June headline figures (item 3.26)', async () => {
    renderAt('/seo?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('469')).toBeInTheDocument())
    expect(screen.getByText('54,744')).toBeInTheDocument()
    expect(screen.getByText('0.86%')).toBeInTheDocument()
    expect(screen.getByText('30.10')).toBeInTheDocument()
    expect(screen.getAllByText('25').length).toBeGreaterThan(0)
    expect(screen.getByText('91.04%')).toBeInTheDocument()
    expect(screen.getAllByText('15').length).toBeGreaterThan(0)
    expect(screen.getAllByText('39.87%').length).toBeGreaterThan(0)
  })

  it('renders Data freshness notice reading latestRecordDate (2026-08-07) — item 3.29', async () => {
    renderAt('/seo?from=2026-06-01&to=2026-06-30')

    await waitFor(() =>
      expect(screen.getByText(/Data as of 2026-08-07/)).toBeInTheDocument(),
    )
  })

  it('renders click-generating queries table with Brand/Non-brand tags (item 3.30)', async () => {
    renderAt('/seo?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('Click-generating queries')).toBeInTheDocument())
    expect(screen.getByText('technorucs')).toBeInTheDocument()
    expect(screen.getAllByText('Brand').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Non-brand').length).toBeGreaterThan(0)
  })

  it('renders high-impression zero-click keywords with Critical/High priorities (item 3.31)', async () => {
    renderAt('/seo?from=2026-06-01&to=2026-06-30')

    await waitFor(() =>
      expect(screen.getByText(/High-impression zero-click keywords/)).toBeInTheDocument(),
    )
    expect(screen.getByText('azure migration consultant')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('ai tools for digital transformation')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('renders backlinks placeholder panel (item 3.33)', async () => {
    renderAt('/seo?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText(/Ubersuggest backlinks integration/)).toBeInTheDocument())
  })

  it('a range before earliestRecordDate shows explicit no data (P4)', async () => {
    renderAt('/seo?from=2026-04-01&to=2026-04-30')

    await waitFor(() =>
      expect(screen.getByText(/No data before 2026-05-01/)).toBeInTheDocument(),
    )
  })
})
