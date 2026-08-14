import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearStoredRole, readStoredRole, ROLE_STORAGE_KEY, writeStoredRole } from './roleStorage'

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('roleStorage (TAD ADR-015)', () => {
  it('round-trips a role through sessionStorage', () => {
    writeStoredRole('cmo')
    expect(readStoredRole()).toBe('cmo')
  })

  it('returns null when nothing has been stored', () => {
    expect(readStoredRole()).toBeNull()
  })

  it('clearStoredRole sends the viewer back to the dialog', () => {
    writeStoredRole('cmo')
    clearStoredRole()
    expect(readStoredRole()).toBeNull()
  })

  it('ignores a stored value that is not a known role id', () => {
    // e.g. a role that existed in an earlier deployment and has since been removed.
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, 'sales-head')
    expect(readStoredRole()).toBeNull()
  })

  it('uses sessionStorage, not localStorage — the dialog must return on a fresh launch', () => {
    writeStoredRole('cmo')
    expect(window.localStorage.getItem(ROLE_STORAGE_KEY)).toBeNull()
  })

  describe('when storage is unavailable (Safari private mode, blocked storage)', () => {
    it('readStoredRole falls back to null instead of throwing', () => {
      vi.spyOn(window.sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      expect(() => readStoredRole()).not.toThrow()
      expect(readStoredRole()).toBeNull()
    })

    it('writeStoredRole swallows the failure — the role still works in-memory', () => {
      vi.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })
      expect(() => writeStoredRole('cmo')).not.toThrow()
    })

    it('clearStoredRole swallows the failure', () => {
      vi.spyOn(window.sessionStorage, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })
      expect(() => clearStoredRole()).not.toThrow()
    })
  })
})
