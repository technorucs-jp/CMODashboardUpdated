import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RoleProvider } from '@/roles/RoleProvider'
import { writeStoredRole } from '@/roles/roleStorage'
import { AppRoutes } from './AppRoutes'

/**
 * Item 0.15, rewritten for TAD ADR-015. The pre-ADR-015 version of this file
 * mocked `@azure/msal-react` and asserted that every route redirected to
 * `/login` when unauthenticated. There is no authentication and no `/login`
 * route any more: the launch dialog stands in front of the whole app until a
 * role is chosen, and once chosen every tab renders.
 */

afterEach(() => {
  window.sessionStorage.clear()
})

function renderAt(path: string) {
  // Matches App.tsx's real provider tree — tabs using useMetricsQuery (item 2.14+)
  // need a QueryClientProvider in scope, same as production.
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  return render(
    <RoleProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </QueryClientProvider>
    </RoleProvider>,
  )
}

const TABS: Array<[string, string]> = [
  ['/overview', 'Overview'],
  ['/ad-campaigns', 'Ad Campaigns'],
  ['/leads', 'Leads'],
  ['/website', 'Website'],
  ['/seo', 'SEO'],
  ['/email', 'Email'],
  ['/linkedin', 'LinkedIn'],
  ['/total-leads', 'Total Leads'],
]

describe('AppRoutes — before a role is chosen', () => {
  it.each(TABS)('shows the role dialog for %s, not its content', (path, heading) => {
    renderAt(path)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: heading })).not.toBeInTheDocument()
  })

  it('shows the role dialog for "/" too', () => {
    renderAt('/')

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('exposes no metric values before the dialog is answered', () => {
    const { container } = renderAt('/ad-campaigns')

    expect(container.textContent).not.toMatch(/₹/)
  })
})

describe('AppRoutes — after a role is chosen', () => {
  it.each(TABS)('renders the %s heading for %s', (path, heading) => {
    writeStoredRole('cmo')

    renderAt(path)

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('redirects "/" to the Overview heading', () => {
    writeStoredRole('cmo')

    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
  })
})

describe('AppRoutes — choosing a role in the dialog', () => {
  it('lands on the requested route, not a redirect target (item 2.5)', () => {
    // The old AuthGuard redirected to /login and relied on router state to come
    // back. RoleGate renders in place instead, so the deep link survives.
    renderAt('/seo?from=2026-06-01&to=2026-06-30')

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByRole('heading', { name: 'SEO' })).toBeInTheDocument()
    expect(screen.getByLabelText('Selected range')).toHaveTextContent('2026-06-01 – 2026-06-30')
  })
})
