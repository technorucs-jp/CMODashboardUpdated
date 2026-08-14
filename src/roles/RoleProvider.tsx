import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { RoleId } from './roles'
import { RoleContext, type RoleContextValue } from './roleContext'
import { clearStoredRole, readStoredRole, writeStoredRole } from './roleStorage'

/**
 * Holds the selected role for the page's lifetime (TAD ADR-015). Replaces
 * `MsalProvider` in the App.tsx provider tree.
 *
 * The context object and `useRole` live in `roleContext.ts` — see the note
 * there for why they are split out.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  // Lazy initialiser — reads storage once on mount, not on every render.
  const [role, setRole] = useState<RoleId | null>(() => readStoredRole())

  const selectRole = useCallback((next: RoleId) => {
    writeStoredRole(next)
    setRole(next)
  }, [])

  const clearRole = useCallback(() => {
    clearStoredRole()
    setRole(null)
  }, [])

  const value = useMemo<RoleContextValue>(
    () => ({ role, selectRole, clearRole }),
    [role, selectRole, clearRole],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
