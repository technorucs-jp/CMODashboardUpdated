/**
 * TAD §0.4 (ADR-013) / TASK.md §3: client-side tenant + optional allowlist check —
 * the SPA-only replacement for the old server-side `signIn` callback. Pure and
 * unit-testable: given an account's username (email) and a config, decide admission.
 * No MSAL import needed beyond the shape we actually read, so this has no dependency
 * on a live MSAL instance and can be tested with plain objects.
 */

export interface MinimalAccount {
  /** MSAL's AccountInfo.username — the account's email for work/school accounts. */
  username: string | null | undefined
}

export interface AllowlistConfig {
  allowedDomain: string
  /** Lower-cased email set. Empty = domain-only, no additional allowlist. */
  allowedEmails: ReadonlySet<string>
}

export function parseAllowedEmails(raw: string | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export const defaultAllowlistConfig: AllowlistConfig = {
  allowedDomain: 'technorucs.com',
  allowedEmails: parseAllowedEmails(import.meta.env.VITE_ALLOWED_EMAILS),
}

export function isAllowedAccount(
  account: MinimalAccount | null | undefined,
  config: AllowlistConfig = defaultAllowlistConfig,
): boolean {
  const email = account?.username?.toLowerCase()
  if (!email) return false

  const domain = email.split('@')[1]
  if (domain !== config.allowedDomain) return false

  if (config.allowedEmails.size > 0 && !config.allowedEmails.has(email)) return false

  return true
}
