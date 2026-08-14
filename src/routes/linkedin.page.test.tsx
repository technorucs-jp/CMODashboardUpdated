import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tests', 'fixtures')
const CONFIG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'data', 'config')

const linkedInFixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'linkedin.json'), 'utf8'))
const compConfig = JSON.parse(readFileSync(join(CONFIG_DIR, 'linkedin-competitors.json'), 'utf8'))

const narrativesFixture = JSON.parse(readFileSync(join(FIXTURES_DIR, 'narratives.json'), 'utf8'))

const loadMock = vi.hoisted(() =>
  vi.fn(async (ch: string) => {
    if (ch === 'linkedin') return linkedInFixture
    if (ch === 'narratives') return narrativesFixture
    return null
  }),
)
const loadConfigMock = vi.hoisted(() => vi.fn(async () => compConfig))
vi.mock('@/data/loader', () => ({ load: loadMock, loadConfig: loadConfigMock }))

const { default: LinkedInPage } = await import('./linkedin')

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LinkedInPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LinkedInPage — end-to-end against real LinkedIn fixture (items 3.35-3.40)', () => {
  it('renders June headline figures (item 3.35)', async () => {
    renderAt('/linkedin?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getAllByText('132').length).toBeGreaterThan(0))
    expect(screen.getByText('2,349')).toBeInTheDocument()
    expect(screen.getByText('16,374')).toBeInTheDocument()
    expect(screen.getByText('2,099')).toBeInTheDocument()
    expect(screen.getAllByText('522').length).toBeGreaterThan(0)
    expect(screen.getAllByText('7').length).toBeGreaterThan(0)
    expect(screen.getAllByText('9').length).toBeGreaterThan(0)
  })

  it('renders PartialDataWarning for partially covered range 15 Jun - 15 Jul (item 3.36, BRD §16 criterion 5)', async () => {
    renderAt('/linkedin?from=2026-06-15&to=2026-07-15')

    await waitFor(() =>
      expect(screen.getByText(/This range is not fully covered by uploaded data/)).toBeInTheDocument(),
    )
    expect(screen.getByText(/2026-07-01 to 2026-07-15/)).toBeInTheDocument()
  })

  it('renders competitor benchmark table (item 3.37)', async () => {
    renderAt('/linkedin?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('Competitor engagement benchmark')).toBeInTheDocument())
    expect(screen.getByText('Leading')).toBeInTheDocument()
    expect(screen.getByText('Behind')).toBeInTheDocument()
  })

  it('renders published posts performance table (item 3.39)', async () => {
    renderAt('/linkedin?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('Published posts performance')).toBeInTheDocument())
    expect(screen.getByText(/Chennai Salesforce/)).toBeInTheDocument()
  })

  it('renders audience demographics (item 3.40)', async () => {
    renderAt('/linkedin?from=2026-06-01&to=2026-06-30')

    await waitFor(() => expect(screen.getByText('Audience & visitor demographics')).toBeInTheDocument())
    expect(screen.getByText('Senior')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
  })
})
