import { useMsal } from '@azure/msal-react'

/**
 * The only anonymous data surface (TASK.md §10). No metric values, ever — just the
 * sign-in action. Real per-user Entra ID SSO (TAD §0.4/ADR-013), no server session.
 */
export default function LoginPage() {
  const { instance } = useMsal()

  return (
    <div>
      <h1>TechnoRUCS CMO Dashboard</h1>
      <button type="button" onClick={() => instance.loginRedirect()}>
        Sign in with Microsoft
      </button>
    </div>
  )
}
