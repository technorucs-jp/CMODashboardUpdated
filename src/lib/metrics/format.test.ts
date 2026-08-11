import { describe, expect, it } from 'vitest'
import { formatMetricValue } from './format'

describe('formatMetricValue', () => {
  it('null always renders as em-dash, regardless of format (P4)', () => {
    for (const format of ['currency', 'integer', 'percent', 'decimal', 'duration', 'score'] as const) {
      expect(formatMetricValue(null, format)).toBe('—')
    }
  })

  it('currency renders with the ₹ symbol and thousands grouping', () => {
    expect(formatMetricValue(38423.31, 'currency')).toBe('₹38,423.31')
  })

  it('currency drops trailing .00 but keeps real decimals', () => {
    expect(formatMetricValue(38423, 'currency')).toBe('₹38,423')
  })

  it('integer rounds and groups', () => {
    expect(formatMetricValue(95823.4, 'integer')).toBe('95,823')
  })

  it('percent renders 2dp with a % sign — value already in percent magnitude', () => {
    expect(formatMetricValue(0.68, 'percent')).toBe('0.68%')
  })

  it('decimal renders 2dp, no unit', () => {
    expect(formatMetricValue(1.82, 'decimal')).toBe('1.82')
  })

  it('duration renders rounded seconds with an s suffix', () => {
    expect(formatMetricValue(107.4, 'duration')).toBe('107s')
  })

  it('score renders a rounded bare integer', () => {
    expect(formatMetricValue(100, 'score')).toBe('100')
  })
})
