import { describe, expect, it, vi } from 'vitest'
import { createKeyedMemo } from './memo'

describe('createKeyedMemo (item 1.30)', () => {
  it('a repeated identical key skips recomputation', () => {
    const memo = createKeyedMemo<number>()
    const compute = vi.fn(() => 42)

    const first = memo.get('ad-campaigns:2026-06-01_2026-06-30', compute)
    const second = memo.get('ad-campaigns:2026-06-01_2026-06-30', compute)

    expect(first).toBe(42)
    expect(second).toBe(42)
    expect(compute).toHaveBeenCalledTimes(1)
  })

  it('a different key (e.g. a different tab or range) recomputes independently', () => {
    const memo = createKeyedMemo<number>()
    const computeA = vi.fn(() => 1)
    const computeB = vi.fn(() => 2)

    memo.get('ad-campaigns:2026-06-01_2026-06-30', computeA)
    memo.get('leads:2026-06-01_2026-06-30', computeB)

    expect(computeA).toHaveBeenCalledTimes(1)
    expect(computeB).toHaveBeenCalledTimes(1)
  })

  it('clear() resets the cache — a subsequent get() recomputes', () => {
    const memo = createKeyedMemo<number>()
    const compute = vi.fn(() => 1)
    memo.get('k', compute)
    memo.clear()
    memo.get('k', compute)
    expect(compute).toHaveBeenCalledTimes(2)
  })
})
