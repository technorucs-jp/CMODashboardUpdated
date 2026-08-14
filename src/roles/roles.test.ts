import { describe, expect, it } from 'vitest'
import { DEFAULT_ROLE_ID, isRoleId, roleById, ROLES } from './roles'

describe('roles (TAD ADR-015)', () => {
  it('defines exactly one role, CMO', () => {
    expect(ROLES).toHaveLength(1)
    expect(ROLES[0].id).toBe('cmo')
    expect(ROLES[0].label).toBe('CMO')
  })

  it('defaults to a role that actually exists', () => {
    expect(isRoleId(DEFAULT_ROLE_ID)).toBe(true)
  })

  it('every role has a label and a description for the dialog', () => {
    for (const role of ROLES) {
      expect(role.label.length).toBeGreaterThan(0)
      expect(role.description.length).toBeGreaterThan(0)
    }
  })

  describe('isRoleId', () => {
    it('accepts a known id', () => {
      expect(isRoleId('cmo')).toBe(true)
    })

    it.each([['viewer'], [''], ['CMO']])('rejects %o', (value) => {
      expect(isRoleId(value)).toBe(false)
    })

    it.each([[null], [undefined], [42], [{ id: 'cmo' }]])('rejects the non-string %o', (value) => {
      expect(isRoleId(value)).toBe(false)
    })
  })

  it('roleById returns the definition', () => {
    expect(roleById('cmo').label).toBe('CMO')
  })
})
