import type { ReactNode } from 'react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAllowedAccount } from './isAllowedAccount'

/**
 * Client-side replacement for the old `middleware.ts` (TAD §0.4, ADR-013). There is
 * no server-side matcher, so every protected route must be wrapped by this — it is
 * not a single file that catches all paths, it is a component in the route tree.
 *
 * Local-dev bypass: skips the real MSAL/Entra check when running under
 * `npm run dev`. Deliberately checks `MODE === 'development'`, not the more
 * obvious-looking `DEV` flag — Vitest also sets `DEV: true` for test runs
 * (its default `MODE` is `'test'`, only `vite build` sets `'production'`),
 * so gating on `DEV` alone would silently disable every auth test too.
 * `MODE` is `'development'` only for the real dev server, never in test runs
 * or `npm run build`'s output — so this cannot ship to the deployed site by
 * accident. Real Entra credentials aren't configured yet (TAD §16.4 flags
 * this), so this is what lets local checking happen without them; it does
 * not weaken the production security boundary, which still requires real
 * sign-in once those credentials exist.
 */
const BYPASS_AUTH_IN_DEV = import.meta.env.MODE === 'development'

export function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const location = useLocation()

  if (BYPASS_AUTH_IN_DEV) {
    return <>{children}</>
  }

  const allowed = isAuthenticated && isAllowedAccount(accounts[0])

  if (!allowed) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
