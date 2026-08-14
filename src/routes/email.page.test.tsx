import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EmailPage from './email'

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <EmailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EmailPage — static not yet connected state (item 3.34; Wireframe/05-email.jpg)', () => {
  it('renders not yet connected message unaffected by range changes', () => {
    renderAt('/email?from=2026-06-01&to=2026-06-30')

    expect(screen.getByRole('heading', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByText(/Instantly\.ai email integration is not yet connected/)).toBeInTheDocument()
  })

  it('renders the same message for a completely different date range', () => {
    renderAt('/email?from=2026-01-01&to=2026-01-31')

    expect(screen.getByRole('heading', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByText(/Instantly\.ai email integration is not yet connected/)).toBeInTheDocument()
  })
})
