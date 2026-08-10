import type { Configuration } from '@azure/msal-browser'

/**
 * MSAL browser-only SPA config (TAD §0.4, ADR-013). No server, no session cookie —
 * Entra's own ID token is the credential. `clientId`/`tenantId` are public identifiers,
 * not secrets (TAD §0.8); it is safe for them to end up in the client bundle.
 *
 * `cacheLocation: 'sessionStorage'` (not `localStorage`) so the token does not
 * outlive the browser tab — reduces the window an XSS bug could exfiltrate it in.
 */

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID
const redirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI

if (!clientId || !tenantId) {
  // Non-fatal: lets `npm run build`/tests proceed without real Entra registration
  // values present (e.g. CI, or before the CMO/IT admin has completed the app
  // registration — an external, non-repo step). Sign-in itself will simply fail
  // until these are set.
  console.warn(
    '[auth] VITE_MSAL_CLIENT_ID / VITE_MSAL_TENANT_ID are not set — see .env.example. Sign-in will not work until they are.',
  )
}

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId || '00000000-0000-0000-0000-000000000000',
    authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
    redirectUri: redirectUri || undefined,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}
