import { createContext, useContext } from 'react'
import type { RoleId } from './roles'

/**
 * The context object and its hook, kept apart from `RoleProvider.tsx` because a
 * module that exports a component may not also export other things without
 * breaking Fast Refresh (`react-refresh/only-export-components`).
 *
 * This is **not** an auth context. There is no token, no session, no identity
 * claim, and nothing here is trusted for access control — see TAD §16.4 and
 * BRD §15.2's open item. It answers "who is looking at this", not "may they".
 */

export interface RoleContextValue {
  /** `null` until the launch dialog has been answered. */
  readonly role: RoleId | null
  readonly selectRole: (role: RoleId) => void
  /** Returns to the launch dialog. Kept for a future "switch role" affordance. */
  readonly clearRole: () => void
}

export const RoleContext = createContext<RoleContextValue | null>(null)

export function useRole(): RoleContextValue {
  const value = useContext(RoleContext)
  if (!value) throw new Error('useRole must be used inside a RoleProvider')
  return value
}
