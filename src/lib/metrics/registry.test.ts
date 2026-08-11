import { describe, expect, it } from 'vitest'
import { registry } from './registry'

describe('registry.ts (item 1.15)', () => {
  it("meta.costPerConversation is lower-better", () => {
    expect(registry['meta.costPerConversation'].polarity).toBe('lower-better')
  })

  it('ga4.totalUsers is non-additive', () => {
    expect(registry['ga4.totalUsers'].additive).toBe(false)
  })

  it('meta.reach is also non-additive (de-duplicated by the platform, same as totalUsers)', () => {
    expect(registry['meta.reach'].additive).toBe(false)
  })

  it('every metric has id, label, unit, polarity, additive, format', () => {
    for (const [key, def] of Object.entries(registry)) {
      expect(def.id).toBe(key)
      expect(typeof def.label).toBe('string')
      expect(typeof def.unit).toBe('string')
      expect(['higher-better', 'lower-better', 'neutral']).toContain(def.polarity)
      expect(typeof def.additive).toBe('boolean')
      expect(['currency', 'integer', 'percent', 'decimal', 'duration', 'score']).toContain(def.format)
    }
  })
})
