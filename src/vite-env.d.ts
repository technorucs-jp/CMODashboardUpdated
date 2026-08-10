/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Entra app registration's public client ID (not a secret — TAD §0.8). */
  readonly VITE_MSAL_CLIENT_ID: string
  /** Restricts login to the technorucs.com Entra tenant. */
  readonly VITE_MSAL_TENANT_ID: string
  /** Post-login redirect target. */
  readonly VITE_MSAL_REDIRECT_URI: string
  /** Optional comma-separated allowlist on top of the tenant check; empty = tenant-only. */
  readonly VITE_ALLOWED_EMAILS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
