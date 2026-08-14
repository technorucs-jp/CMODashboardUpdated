import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RoleProvider } from './RoleProvider'
import { RoleGate } from './RoleGate'
import { ROLE_STORAGE_KEY } from './roleStorage'

afterEach(() => {
  window.sessionStorage.clear()
})

function renderGate() {
  return render(
    <RoleProvider>
      <RoleGate>
        <p>Dashboard content</p>
      </RoleGate>
    </RoleProvider>,
  )
}

function clickContinue() {
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
}

describe('RoleGate (TAD ADR-015 — replaces AuthGuard)', () => {
  it('shows the role dialog on launch, not the dashboard', () => {
    renderGate()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument()
  })

  it('renders the dashboard after a role is chosen', () => {
    renderGate()

    clickContinue()

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('persists the choice so a refresh within the session skips the dialog', () => {
    const { unmount } = renderGate()
    clickContinue()
    unmount()

    // Fresh mount, same session — what a page refresh looks like.
    renderGate()

    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the dialog again for a new session (empty sessionStorage)', () => {
    const { unmount } = renderGate()
    clickContinue()
    unmount()

    // A new tab / relaunched browser starts with empty sessionStorage.
    window.sessionStorage.clear()
    renderGate()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('stores the selected role id', () => {
    renderGate()

    clickContinue()

    expect(window.sessionStorage.getItem(ROLE_STORAGE_KEY)).toBe('cmo')
  })
})
