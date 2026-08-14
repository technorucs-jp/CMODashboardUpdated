import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RoleProvider } from '@/roles/RoleProvider'
import { writeStoredRole } from '@/roles/roleStorage'
import { AppRoutes } from './AppRoutes'

// A role is already chosen for these tests — the launch dialog (TAD ADR-015)
// is not what's under test here, the layout's mount behaviour is. This replaces
// the pre-ADR-015 `@azure/msal-react` mock that used to serve the same purpose.
beforeEach(() => {
  writeStoredRole('cmo')
})

afterEach(() => {
  window.sessionStorage.clear()
})

describe('DashboardLayout — mounted once (item 0.14)', () => {
  it('does not remount the sidebar/topbar when navigating between tabs', () => {
    render(
      <RoleProvider>
        <MemoryRouter initialEntries={['/overview']}>
          <AppRoutes />
        </MemoryRouter>
      </RoleProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    const topBarBefore = screen.getByRole('heading', { name: 'TechnoRUCS' })
    const sidebarNavBefore = screen.getByRole('navigation', { name: 'Channels' })

    // Accessible name concatenates the label and source sublabel with no separator
    // (e.g. "LeadsZoho") — anchor on the start so it doesn't also match "Total Leads...".
    fireEvent.click(screen.getByRole('link', { name: /^Leads/ }))

    expect(screen.getByRole('heading', { name: 'Leads' })).toBeInTheDocument()
    const topBarAfter = screen.getByRole('heading', { name: 'TechnoRUCS' })
    const sidebarNavAfter = screen.getByRole('navigation', { name: 'Channels' })

    // Same DOM node identity across navigation === the layout route (and therefore
    // Sidebar/TopBar) was never unmounted and remounted — only the <Outlet/> content changed.
    expect(topBarAfter).toBe(topBarBefore)
    expect(sidebarNavAfter).toBe(sidebarNavBefore)
  })
})
