import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'

const { useIsAuthenticatedMock, useMsalMock } = vi.hoisted(() => ({
  useIsAuthenticatedMock: vi.fn(),
  useMsalMock: vi.fn(),
}))

vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: useIsAuthenticatedMock,
  useMsal: useMsalMock,
}))

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/overview']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/overview"
          element={
            <AuthGuard>
              <div>Protected content</div>
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthGuard', () => {
  it('redirects to /login when there is no active account', () => {
    useIsAuthenticatedMock.mockReturnValue(false)
    useMsalMock.mockReturnValue({ accounts: [] })

    renderGuarded()

    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('redirects to /login when the account is authenticated but not an allowed tenant', () => {
    useIsAuthenticatedMock.mockReturnValue(true)
    useMsalMock.mockReturnValue({ accounts: [{ username: 'x@gmail.com' }] })

    renderGuarded()

    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders children for an authenticated technorucs.com account', () => {
    useIsAuthenticatedMock.mockReturnValue(true)
    useMsalMock.mockReturnValue({ accounts: [{ username: 'jayaprakash@technorucs.com' }] })

    renderGuarded()

    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })
})
