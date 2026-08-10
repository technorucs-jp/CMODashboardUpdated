import { describe, expect, it } from 'vitest'
import { isAllowedAccount, parseAllowedEmails, type AllowlistConfig } from './isAllowedAccount'

const tenantOnly: AllowlistConfig = {
  allowedDomain: 'technorucs.com',
  allowedEmails: new Set(),
}

describe('isAllowedAccount', () => {
  it('rejects a different tenant domain', () => {
    expect(isAllowedAccount({ username: 'x@gmail.com' }, tenantOnly)).toBe(false)
  })

  it('accepts the technorucs.com tenant when the allowlist is empty', () => {
    expect(isAllowedAccount({ username: 'x@technorucs.com' }, tenantOnly)).toBe(true)
  })

  it('rejects no account at all', () => {
    expect(isAllowedAccount(null, tenantOnly)).toBe(false)
    expect(isAllowedAccount({ username: null }, tenantOnly)).toBe(false)
  })

  it('is case-insensitive on the domain check', () => {
    expect(isAllowedAccount({ username: 'X@TechnoRUCS.com' }, tenantOnly)).toBe(true)
  })

  it('enforces a non-empty allowlist on top of the tenant check', () => {
    const withAllowlist: AllowlistConfig = {
      allowedDomain: 'technorucs.com',
      allowedEmails: new Set(['jayaprakash@technorucs.com']),
    }
    expect(isAllowedAccount({ username: 'jayaprakash@technorucs.com' }, withAllowlist)).toBe(true)
    expect(isAllowedAccount({ username: 'someoneelse@technorucs.com' }, withAllowlist)).toBe(false)
  })
})

describe('parseAllowedEmails', () => {
  it('parses a comma-separated list, trimmed and lower-cased', () => {
    const result = parseAllowedEmails(' A@Technorucs.com, b@technorucs.com ,')
    expect(result.has('a@technorucs.com')).toBe(true)
    expect(result.has('b@technorucs.com')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('returns an empty set for undefined/empty input', () => {
    expect(parseAllowedEmails(undefined).size).toBe(0)
    expect(parseAllowedEmails('').size).toBe(0)
  })
})
