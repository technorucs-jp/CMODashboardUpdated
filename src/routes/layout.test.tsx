import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'

const { useIsAuthenticatedMock, useMsalMock } = vi.hoisted(() => ({
  useIsAuthenticatedMock: vi.fn(),
  useMsalMock: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: useIsAuthenticatedMock,
  useMsal: useMsalMock,
}))

describe('DashboardLayout — mounted once (item 0.14)', () => {
  it('does not remount the sidebar/topbar when navigating between tabs', () => {
    useIsAuthenticatedMock.mockReturnValue(true)
    useMsalMock.mockReturnValue({ accounts: [{ username: 'jayaprakash@technorucs.com' }] })

    render(
      <MemoryRouter initialEntries={['/overview']}>
        <AppRoutes />
      </MemoryRouter>,
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
