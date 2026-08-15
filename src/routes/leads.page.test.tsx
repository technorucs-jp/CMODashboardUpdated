import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const zohoFixture = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'zoho-crm.json'), 'utf8'))
const salesReps = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'config', 'sales-reps.json'), 'utf8'))

const narrativesFixture = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'narratives.json'), 'utf8'))

const loadMock = vi.hoisted(() =>
  vi.fn(async (ch: string) => {
    if (ch === 'zoho-crm') return zohoFixture
    if (ch === 'narratives') return narrativesFixture
    return null
  }),
)
const loadConfigMock = vi.hoisted(() => vi.fn(async () => salesReps))
vi.mock('@/data/loader', () => ({ load: loadMock, loadConfig: loadConfigMock }))

const { default: LeadsPage } = await import('./leads')

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <LeadsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const JUNE = '/leads?from=2026-06-01&to=2026-06-30'

describe('LeadsPage — end-to-end against the real June fixture (items 3.7-3.16)', () => {
  it('renders the real June headline figures', async () => {
    renderAt(JUNE)
    await waitFor(() => expect(screen.getByText('Total inbound leads')).toBeInTheDocument())

    expect(screen.getByText('49')).toBeInTheDocument()
    expect(screen.getByText('30.61% contact rate')).toBeInTheDocument()
    expect(screen.getByText('55.10% stuck here')).toBeInTheDocument()
    expect(screen.getByText('14.29% lost rate')).toBeInTheDocument()
  })

  it('**renders Contact in Future and Junk cards even at zero** — the BRD v2.1 §7.1 bug', async () => {
    renderAt(JUNE)
    // Each zero-count status shows up on three surfaces by design: an overview
    // card, a row in the all-inbound status distribution, and a line in the Meta
    // Ads donut's legend. All three are built from the same fixed status list, so
    // none of them can drop a status just because its count is 0.
    await waitFor(() => expect(screen.getAllByText('Contact in Future')).toHaveLength(3))
    expect(screen.getAllByText('Junk')).toHaveLength(3)
    expect(screen.getByText('Meetings scheduled')).toBeInTheDocument() // card label
    // The status's own name ("Meeting Scheduled") appears on the two breakdown
    // surfaces — the status distribution and the donut legend.
    expect(screen.getAllByText('Meeting Scheduled')).toHaveLength(2)
  })

  it('**shows zero-assignment reps with "Not assigned"** — the single-point-of-failure finding', async () => {
    renderAt(JUNE)
    await waitFor(() => expect(screen.getByText('Gopinath')).toBeInTheDocument())

    for (const name of ['Rathish', 'Mohan', 'Ram']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.getAllByText('Not assigned')).toHaveLength(3)
  })

  it('the rep table shows Gopinath 43 / 27.91% and Jeevanantham J. 6 / 50.00%', async () => {
    renderAt(JUNE)
    await waitFor(() => expect(screen.getByText('Gopinath')).toBeInTheDocument())

    const gopinathRow = screen.getByText('Gopinath').closest('tr')!
    expect(within(gopinathRow).getByText('43')).toBeInTheDocument()
    expect(within(gopinathRow).getByText('27.91%')).toBeInTheDocument()

    const jeevananthamRow = screen.getByText('Jeevanantham J.').closest('tr')!
    expect(within(jeevananthamRow).getByText('50.00%')).toBeInTheDocument()
  })

  it('renders the intent-bucket panel as an explicit unclassified state, not an empty table (item 3.16)', async () => {
    renderAt(JUNE)
    await waitFor(() => expect(screen.getByText(/Not yet classified/)).toBeInTheDocument())
    expect(screen.getByText(/no classifier is\s+implemented here by design/)).toBeInTheDocument()
  })

  it('exposes no lead free-text anywhere in the rendered output (P3′)', async () => {
    const { container } = renderAt(JUNE)
    await waitFor(() => expect(screen.getByText('Total inbound leads')).toBeInTheDocument())
    expect(container.textContent!.toLowerCase()).not.toContain('how does the software work')
  })

  it('a range before earliestRecordDate shows an explicit no-data state, not zeros', async () => {
    renderAt('/leads?from=2026-04-01&to=2026-04-30')
    await waitFor(() => expect(screen.getByText(/No data before 2026-05-01/)).toBeInTheDocument())
    expect(screen.queryByText('Total inbound leads')).not.toBeInTheDocument()
  })
})
