import type { ReactNode } from 'react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAllowedAccount } from './isAllowedAccount'

/**
 * Client-side replacement for the old `middleware.ts` (TAD §0.4, ADR-013). There is
 * no server-side matcher, so every protected route must be wrapped by this — it is
 * not a single file that catches all paths, it is a component in the route tree.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const location = useLocation()

  const allowed = isAuthenticated && isAllowedAccount(accounts[0])

  if (!allowed) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
