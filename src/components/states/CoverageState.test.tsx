import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoverageState } from './CoverageState'
import type { Coverage } from '@/lib/coverage/coverage'

describe('CoverageState (item 3.1)', () => {
  it('renders nothing for "full" — the caller shows real data instead', () => {
    const { container } = render(<CoverageState coverage={{ kind: 'full' }} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders NoDataBeforeDate for "none" with a known earliest date', () => {
    render(<CoverageState coverage={{ kind: 'none', earliest: '2026-05-01', latest: '2026-08-09' }} />)
    expect(screen.getByText(/No data before 2026-05-01/)).toBeInTheDocument()
  })

  it('renders the generic EmptyState for "none" with no known history at all', () => {
    render(<CoverageState coverage={{ kind: 'none', earliest: null, latest: null }} />)
    expect(screen.getByText(/No data available/)).toBeInTheDocument()
  })

  it('renders PartialDataWarning for "partial", stating what\'s missing', () => {
    const coverage: Coverage = {
      kind: 'partial',
      available: { from: '2026-05-01', to: '2026-05-31' },
      missingBefore: '2026-05-01',
    }
    render(<CoverageState coverage={coverage} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/2026-05-01/)
  })

  it('renders PartialDataWarning for "requires-full-coverage" (item 3.36), listing the gap', () => {
    const coverage: Coverage = { kind: 'requires-full-coverage', gaps: [{ from: '2026-07-01', to: '2026-07-15' }] }
    render(<CoverageState coverage={coverage} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/2026-07-01 to 2026-07-15/)
  })

  it('renders LaggingDataNotice for "lagging"', () => {
    render(<CoverageState coverage={{ kind: 'lagging', dataAsOf: '2026-08-07' }} />)
    expect(screen.getByText(/Data as of 2026-08-07/)).toBeInTheDocument()
  })

  it('renders NotConnectedPanel for "not-connected"', () => {
    render(<CoverageState coverage={{ kind: 'not-connected' }} />)
    expect(screen.getByText(/Not yet connected/)).toBeInTheDocument()
  })
})
