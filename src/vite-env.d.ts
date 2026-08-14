/// <reference types="vite/client" />

/**
 * No app-specific environment variables remain (TAD §0.8).
 *
 * The MSAL/Entra values that used to be declared here (`VITE_MSAL_CLIENT_ID`,
 * `VITE_MSAL_TENANT_ID`, `VITE_MSAL_REDIRECT_URI`, `VITE_ALLOWED_EMAILS`) went
 * away with ADR-015 — the app performs no authentication, so it has no client
 * ID, tenant, redirect URI, or allowlist to configure. It holds no third-party
 * credentials either (P2). Vite's own `ImportMetaEnv` (`MODE`, `DEV`, `PROD`,
 * `BASE_URL`) still applies via the reference above; a future `VITE_*` variable
 * would be declared here by re-adding an `ImportMetaEnv` interface.
 */
