import type { ReactNode } from 'react'
import { useRole } from './roleContext'
import { RoleSelectDialog } from './RoleSelectDialog'

/**
 * Replaces `AuthGuard` (TAD ADR-015, superseding ADR-013). Renders the launch
 * dialog until a role is chosen, then the dashboard.
 *
 * The difference from what it replaces is worth being blunt about: `AuthGuard`
 * was a (client-side) access control, and this is not one. Nothing here keeps
 * anyone out — the viewer picks a role and continues. Access control for the
 * deployment, if it is required, is host-level configuration (TAD §16.4 /
 * BRD §15.2's open item), not this component.
 *
 * Unlike `AuthGuard` this does not redirect, so the URL is preserved across the
 * dialog — a bookmarked `/leads?from=…&to=…` still lands on that exact view
 * after Continue (item 2.5).
 */
export function RoleGate({ children }: { children: ReactNode }) {
  const { role } = useRole()

  if (!role) {
    return <RoleSelectDialog />
  }

  return <>{children}</>
}
