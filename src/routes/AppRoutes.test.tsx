import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRoutes } from './AppRoutes'

const { useIsAuthenticatedMock, useMsalMock } = vi.hoisted(() => ({
  useIsAuthenticatedMock: vi.fn(),
  useMsalMock: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: useIsAuthenticatedMock,
  useMsal: useMsalMock,
}))

function renderAt(path: string) {
  // Matches App.tsx's real provider tree — tabs using useMetricsQuery (item 2.14+)
  // need a QueryClientProvider in scope, same as production.
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const PROTECTED_ROUTES: Array<[string, string]> = [
  ['/overview', 'Overview'],
  ['/ad-campaigns', 'Ad Campaigns'],
  ['/leads', 'Leads'],
  ['/website', 'Website'],
  ['/seo', 'SEO'],
  ['/email', 'Email'],
  ['/linkedin', 'LinkedIn'],
  ['/total-leads', 'Total Leads'],
]

describe('AppRoutes — unauthenticated', () => {
  it.each(PROTECTED_ROUTES)('renders the login page for %s, not its content', (path) => {
    useIsAuthenticatedMock.mockReturnValue(false)
    useMsalMock.mockReturnValue({ accounts: [] })

    renderAt(path)

    expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument()
  })

  it('redirects "/" to the login page too', () => {
    useIsAuthenticatedMock.mockReturnValue(false)
    useMsalMock.mockReturnValue({ accounts: [] })

    renderAt('/')

    expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument()
  })
})

describe('AppRoutes — authenticated as a technorucs.com account', () => {
  it.each(PROTECTED_ROUTES)('renders the %s heading for %s', (path, heading) => {
    useIsAuthenticatedMock.mockReturnValue(true)
    useMsalMock.mockReturnValue({ accounts: [{ username: 'jayaprakash@technorucs.com' }] })

    renderAt(path)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('redirects "/" to the Overview heading', () => {
    useIsAuthenticatedMock.mockReturnValue(true)
    useMsalMock.mockReturnValue({ accounts: [{ username: 'jayaprakash@technorucs.com' }] })

    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })
})
