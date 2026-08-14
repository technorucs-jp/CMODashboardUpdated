import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures')
const CONFIG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'config')

function fixtureJson(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8'))
}
function configJson(name: string): unknown {
  return JSON.parse(readFileSync(join(CONFIG_DIR, `${name}.json`), 'utf8'))
}

const FIXTURE_BY_CHANNEL: Record<string, unknown> = {
  'meta-ads': fixtureJson('meta-ads'),
  ga4: fixtureJson('ga4'),
  gsc: fixtureJson('gsc'),
  linkedin: fixtureJson('linkedin'),
  'zoho-crm': fixtureJson('zoho-crm'),
}
const CONFIG_BY_NAME: Record<string, unknown> = {
  thresholds: configJson('thresholds'),
  'brand-terms': configJson('brand-terms'),
}

const loadMock = vi.hoisted(() => vi.fn(async (channel: string) => FIXTURE_BY_CHANNEL[channel]))
const loadConfigMock = vi.hoisted(() => vi.fn(async (name: string) => CONFIG_BY_NAME[name]))
vi.mock('@/data/loader', () => ({ load: loadMock, loadConfig: loadConfigMock }))

const { default: OverviewPage } = await import('./overview')

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <OverviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('OverviewPage — end-to-end against the real fixtures (items 3.2-3.6)', () => {
  it('renders June KPI cards with real figures, not placeholders', async () => {
    renderAt('/overview?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('₹38,423.31')).toBeInTheDocument())
    // "101" appears for both the Total Leads and Meta Conversations cards.
    expect(screen.getAllByText('101').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('1,720')).toBeInTheDocument()
    expect(screen.getByText('469')).toBeInTheDocument()
    expect(screen.getByText('132')).toBeInTheDocument()
  })

  it('renders the channel-health table with status tags — text labels, not colour-only (item 2.10)', async () => {
    renderAt('/overview?from=2026-06-01&to=2026-06-30&cf=2026-05-01&ct=2026-05-31')

    // "Action needed" appears three times: cost/conversation, conversations, AND
    // non-brand clicks (the SEO row — matches the wireframe's own "-80.5%
    // Action needed"). Cost/conversation and conversations diverge from the
    // wireframe's hand-assigned "Monitor" — see overview.ts's header comment.
    await waitFor(() => expect(screen.getAllByText('Action needed').length).toBe(3))
    expect(screen.getByText('Good')).toBeInTheDocument()
  })

  it('renders the three period-comparison blocks with real May→June figures', async () => {
    renderAt('/overview?from=2026-06-01&to=2026-06-30&cf=2026-05-01&ct=2026-05-31')

    // "Meta Ads" appears as both the block title and a channel-health source cell.
    await waitFor(() => expect(screen.getAllByText('Meta Ads').length).toBeGreaterThan(0))
    expect(screen.getByText('Leads + Website')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn + SEO')).toBeInTheDocument()
    expect(screen.getByText('+16.5pp')).toBeInTheDocument() // contact rate — item 3.6
  })

  it('falls back to "vs. previous N days" and labels it, when no comparison range is set (item 3.4)', async () => {
    renderAt('/overview?from=2026-06-01&to=2026-06-30')

    // Rendered in the Channel health heading, its table's comparison-column
    // header, and the Period comparison heading — three places, by design.
    await waitFor(() => expect(screen.getAllByText(/vs\. previous 30 days/).length).toBe(3))
  })

  it('LinkedIn rows show an explicit "no data" state for a May comparison, not a fabricated number', async () => {
    renderAt('/overview?from=2026-06-01&to=2026-06-30&cf=2026-05-01&ct=2026-05-31')

    await waitFor(() => expect(screen.getAllByText('no data for one period').length).toBeGreaterThan(0))
  })
})
