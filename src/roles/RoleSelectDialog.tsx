import { useEffect, useRef, useState } from 'react'
import { DEFAULT_ROLE_ID, ROLES, type RoleId } from './roles'
import { useRole } from './roleContext'

/**
 * The launch dialog (TAD ADR-015) — replaces the `/login` route. Shown once per
 * browser session before the dashboard renders; the viewer picks a role and
 * continues.
 *
 * P8 (frozen visual system): dark surfaces, borders, and text all come from
 * `tokens.css`. No literal colour values here.
 *
 * Accessibility (item 5.20's rules applied at build time rather than retrofitted):
 * a labelled modal dialog, a real radiogroup so arrow keys work, a visible
 * focus target on open, and no colour-only meaning.
 */
export function RoleSelectDialog() {
  const { selectRole } = useRole()
  const [pending, setPending] = useState<RoleId>(DEFAULT_ROLE_ID)
  const continueRef = useRef<HTMLButtonElement>(null)

  // A modal that blocks the whole app should place focus inside itself on open,
  // so a keyboard viewer isn't left on the document body behind it.
  useEffect(() => {
    continueRef.current?.focus()
  }, [])

  return (
    <div className="role-dialog-overlay">
      <div
        className="role-dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-dialog-title"
        aria-describedby="role-dialog-subtitle"
      >
        <h1 id="role-dialog-title" style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          TechnoRUCS CMO Dashboard
        </h1>
        <p
          id="role-dialog-subtitle"
          style={{ margin: '6px 0 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}
        >
          Select your role to continue.
        </p>

        <div role="radiogroup" aria-labelledby="role-dialog-title" style={{ display: 'grid', gap: 8 }}>
          {ROLES.map((role) => {
            const selected = pending === role.id
            return (
              <label
                key={role.id}
                className="role-option"
                data-selected={selected}
                style={{ borderColor: selected ? 'var(--accent-1)' : 'var(--color-border)' }}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.id}
                  checked={selected}
                  onChange={() => setPending(role.id)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>{role.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {role.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        <button
          type="button"
          className="role-continue"
          ref={continueRef}
          onClick={() => selectRole(pending)}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
