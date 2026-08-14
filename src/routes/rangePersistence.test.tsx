import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RoleProvider } from '@/roles/RoleProvider'
import { writeStoredRole } from '@/roles/roleStorage'
import { AppRoutes } from './AppRoutes'

/**
 * Item 2.4/2.5 — both pickers live in the shared `TopBar`, and the selected
 * range must survive a tab switch (the URL is the only state, item 2.3).
 *
 * A role is pre-selected so the launch dialog (TAD ADR-015) isn't in the way;
 * this replaces the pre-ADR-015 `@azure/msal-react` mock. The dialog's own
 * effect on a deep link is covered in `AppRoutes.test.tsx`.
 */
beforeEach(() => {
  writeStoredRole('cmo')
})

afterEach(() => {
  window.sessionStorage.clear()
})

function renderAt(path: string) {
  // QueryClientProvider is needed now that /overview itself calls useMetricsQuery
  // (items 3.2-3.6) — it was a placeholder page with no data fetching before.
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

describe('range persists across tab navigation (item 2.4)', () => {
  it('set a range on /leads, navigate to /seo — the range persists and the URL carries it', () => {
    renderAt('/leads?from=2026-06-01&to=2026-06-30')

    expect(screen.getByRole('heading', { name: 'Leads' })).toBeInTheDocument()
    expect(screen.getByLabelText('Selected range')).toHaveTextContent('2026-06-01 – 2026-06-30')

    fireEvent.click(screen.getByRole('link', { name: /SEO/ }))

    expect(screen.getByRole('heading', { name: 'SEO' })).toBeInTheDocument()
    // The range must still read June — this is the whole point of item 2.4.
    expect(screen.getByLabelText('Selected range')).toHaveTextContent('2026-06-01 – 2026-06-30')
  })

  it('a full URL (including cf/ct) round-trips into a fresh render — bookmark/share (item 2.5)', () => {
    renderAt('/overview?from=2026-06-01&to=2026-06-30&cf=2026-05-02&ct=2026-05-31')

    expect(screen.getByLabelText('Selected range')).toHaveTextContent('2026-06-01 – 2026-06-30')
    expect(screen.getByLabelText('Selected comparison range')).toHaveTextContent('2026-05-02 – 2026-05-31')
  })
})
