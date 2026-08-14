import { isRoleId, type RoleId } from './roles'

/**
 * Where the chosen role lives between page loads (TAD ADR-015).
 *
 * `sessionStorage`, not `localStorage`, and the choice is deliberate: the
 * requirement is "show the role popup during app launch", so the dialog has to
 * come back when the dashboard is opened fresh. `sessionStorage` gives exactly
 * that — it survives an accidental refresh mid-session but is gone on a new
 * tab or after the browser closes. `localStorage` would answer the question
 * once and never ask again, which is not what was asked for.
 *
 * Every access is wrapped: `sessionStorage` throws (not returns null) in Safari
 * private mode and when a browser blocks storage entirely. A viewer with
 * storage disabled should get the dialog on every load, not a blank screen.
 */

export const ROLE_STORAGE_KEY = 'technorucs.cmo-dashboard.role'

export function readStoredRole(): RoleId | null {
  try {
    const raw = window.sessionStorage.getItem(ROLE_STORAGE_KEY)
    return isRoleId(raw) ? raw : null
  } catch {
    return null
  }
}

export function writeStoredRole(role: RoleId): void {
  try {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, role)
  } catch {
    // Storage unavailable — the role still works for this page's lifetime via
    // React state; it just won't survive a refresh. Degrading to "ask again"
    // is correct here, so there is nothing to report.
  }
}

export function clearStoredRole(): void {
  try {
    window.sessionStorage.removeItem(ROLE_STORAGE_KEY)
  } catch {
    // As above.
  }
}
