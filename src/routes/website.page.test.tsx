import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures')
const CONFIG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'config')

const ga4Fixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'ga4.json'), 'utf8'))
const pageTypesConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'page-types.json'), 'utf8'))

const metaAdsFixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'meta-ads.json'), 'utf8'))
const narrativesFixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'narratives.json'), 'utf8'))

const loadMock = vi.hoisted(() =>
  vi.fn(async (ch: string) => {
    if (ch === 'ga4') return ga4Fixture
    if (ch === 'meta-ads') return metaAdsFixture
    if (ch === 'narratives') return narrativesFixture
    return null
  }),
)
const loadConfigMock = vi.hoisted(() => vi.fn(async () => pageTypesConfig))
vi.mock('@/data/loader', () => ({ load: loadMock, loadConfig: loadConfigMock }))

const { default: WebsitePage } = await import('./website')

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <WebsitePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('WebsitePage — end-to-end against real GA4 fixture (items 3.17-3.25)', () => {
  it('renders June headline figures', async () => {
    renderAt('/website?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('1,720')).toBeInTheDocument())
    expect(screen.getByText('2,513')).toBeInTheDocument()
    expect(screen.getByText('1,123')).toBeInTheDocument()
    expect(screen.getByText('34.71%')).toBeInTheDocument()
    expect(screen.getByText('107s')).toBeInTheDocument()
    expect(screen.getByText('1.46')).toBeInTheDocument()
    expect(screen.getByText('71')).toBeInTheDocument()
  })

  it('renders "n/a for multi-day ranges" for total users on a multi-day range (item 3.18, P1)', async () => {
    renderAt('/website?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('n/a for multi-day ranges')).toBeInTheDocument())
  })

  it('renders AI referral panel with chatgpt, copilot, perplexity metrics (item 3.22)', async () => {
    renderAt('/website?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('AI Assistant Referral Insight')).toBeInTheDocument())
    expect(screen.getByText('80.00%')).toBeInTheDocument()
    expect(screen.getByText('20.00%')).toBeInTheDocument()
  })

  it('renders page type tags in top pages table (item 3.23)', async () => {
    renderAt('/website?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('Top pages & content classification')).toBeInTheDocument())
    expect(screen.getByText('Talent')).toBeInTheDocument()
    expect(screen.getAllByText('Service').length).toBeGreaterThan(0)
    expect(screen.getByText('Conversion')).toBeInTheDocument()
  })

  it('renders landing pages and country engagement table (item 3.24)', async () => {
    renderAt('/website?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('Top landing pages (entry points)')).toBeInTheDocument())
    expect(screen.getByText('IN')).toBeInTheDocument()
    expect(screen.getByText('US')).toBeInTheDocument()
    expect(screen.getByText('desktop')).toBeInTheDocument()
  })

  it('renders user journey path table (item 3.25)', async () => {
    renderAt('/website?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('User journey — path exploration')).toBeInTheDocument())
    expect(screen.getAllByText('/contact-us/').length).toBeGreaterThan(0)
  })

  it('a range before earliestRecordDate shows an explicit no-data state, not zeros (P4)', async () => {
    renderAt('/website?from=2026-04-01&to=2026-04-30')

    await waitFor(() =>
      expect(screen.getByText(/No data before 2026-05-01/)).toBeInTheDocument(),
    )
  })
})
