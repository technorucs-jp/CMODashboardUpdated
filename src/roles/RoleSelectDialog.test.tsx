import { afterEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RoleProvider } from './RoleProvider'
import { RoleSelectDialog } from './RoleSelectDialog'
import { ROLES } from './roles'

afterEach(() => {
  window.sessionStorage.clear()
})

function renderDialog() {
  return render(
    <RoleProvider>
      <RoleSelectDialog />
    </RoleProvider>,
  )
}

describe('RoleSelectDialog (TAD ADR-015 — replaces the /login route)', () => {
  it('is a labelled modal dialog', () => {
    renderDialog()

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName(/TechnoRUCS CMO Dashboard/i)
  })

  it('offers every defined role as a radio option', () => {
    renderDialog()

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(ROLES.length)
    for (const role of ROLES) {
      expect(screen.getByRole('radio', { name: new RegExp(role.label, 'i') })).toBeInTheDocument()
    }
  })

  it('pre-selects the default role so continuing is a single click', () => {
    renderDialog()

    expect(screen.getByRole('radio', { name: /CMO/i })).toBeChecked()
  })

  it('puts focus inside the dialog on open', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: /continue/i })).toHaveFocus()
  })

  it('shows no metric values — this is the only pre-dashboard surface', () => {
    const { container } = renderDialog()

    // Same guarantee the old /login route carried (former item 0.13): nothing
    // resembling a figure renders before the dashboard does.
    expect(container.textContent).not.toMatch(/₹|\d{2,}|%/)
  })

  it('mentions no sign-in, password, or account — there is no authentication here', () => {
    const { container } = renderDialog()

    expect(container.textContent).not.toMatch(/sign in|log in|password|account|microsoft/i)
  })

  it('selecting a role does not navigate — the URL is preserved for item 2.5', () => {
    const before = window.location.href
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    expect(window.location.href).toBe(before)
  })
})
