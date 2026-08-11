import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './AppRoutes'

/**
 * Item 2.4/2.5 — both pickers live in the shared `TopBar`, and the selected
 * range must survive a tab switch (the URL is the only state, item 2.3).
 */
const { useIsAuthenticatedMock, useMsalMock } = vi.hoisted(() => ({
  useIsAuthenticatedMock: vi.fn(),
  useMsalMock: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: useIsAuthenticatedMock,
  useMsal: useMsalMock,
}))

describe('range persists across tab navigation (item 2.4)', () => {
  it('set a range on /leads, navigate to /seo — the range persists and the URL carries it', () => {
    useIsAuthenticatedMock.mockReturnValue(true)
    useMsalMock.mockReturnValue({ accounts: [{ username: 'jayaprakash@technorucs.com' }] })

    render(
      <MemoryRouter initialEntries={['/leads?from=2026-06-01&to=2026-06-30']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Leads' })).toBeInTheDocument()
    expect(screen.getByLabelText('Selected range')).toHaveTextContent('2026-06-01 – 2026-06-30')

    fireEvent.click(screen.getByRole('link', { name: /SEO/ }))

    expect(screen.getByRole('heading', { name: 'SEO' })).toBeInTheDocument()
    // The range must still read June — this is the whole point of item 2.4.
    expect(screen.getByLabelText('Selected range')).toHaveTextContent('2026-06-01 – 2026-06-30')
  })

  it('a full URL (including cf/ct) round-trips into a fresh render — bookmark/share (item 2.5)', () => {
    useIsAuthenticatedMock.mockReturnValue(true)
    useMsalMock.mockReturnValue({ accounts: [{ username: 'jayaprakash@technorucs.com' }] })

    render(
      <MemoryRouter initialEntries={['/overview?from=2026-06-01&to=2026-06-30&cf=2026-05-02&ct=2026-05-31']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Selected range')).toHaveTextContent('2026-06-01 – 2026-06-30')
    expect(screen.getByLabelText('Selected comparison range')).toHaveTextContent('2026-05-02 – 2026-05-31')
  })
})
