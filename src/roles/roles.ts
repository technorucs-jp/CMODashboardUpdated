/**
 * Role definitions (TAD §0.4 / ADR-015). This replaces the Entra/MSAL identity
 * model: the app performs **no authentication**. The launch dialog asks which
 * role the viewer is operating as, and that answer is a label — it gates
 * nothing, filters nothing, and is never a security boundary.
 *
 * There is exactly one role today (CMO), and it sees every tab and every
 * figure. The list shape is kept because "which roles exist" is the thing most
 * likely to change; adding a second role is an entry here plus its `RoleId`,
 * with no change to the dialog, the gate, or any tab.
 *
 * Pure and framework-free on purpose — `RoleProvider`/`RoleSelectDialog` import
 * from here, never the other way round.
 */

export interface RoleDefinition {
  readonly id: string
  /** Shown in the launch dialog and the TopBar. */
  readonly label: string
  /** One line under the label in the dialog explaining what the role sees. */
  readonly description: string
}

export const ROLES = [
  {
    id: 'cmo',
    label: 'CMO',
    description: 'Full access to all eight tabs and every metric.',
  },
] as const satisfies readonly RoleDefinition[]

export type RoleId = (typeof ROLES)[number]['id']

/** Pre-selected in the dialog so the common path is a single click. */
export const DEFAULT_ROLE_ID: RoleId = 'cmo'

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === 'string' && ROLES.some((role) => role.id === value)
}

export function roleById(id: RoleId): RoleDefinition {
  const found = ROLES.find((role) => role.id === id)
  // Unreachable while `id` is a RoleId — this exists so a future hand-written
  // cast can't silently produce an undefined role in the TopBar.
  if (!found) throw new Error(`Unknown role id: ${id}`)
  return found
}
