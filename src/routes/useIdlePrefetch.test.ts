import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const loadMock = vi.hoisted(() => vi.fn(async (_channel: string) => ({})))
vi.mock('@/data/loader', () => ({ load: loadMock }))

import { useIdlePrefetch } from './useIdlePrefetch'

describe('useIdlePrefetch (item 2.7)', () => {
  beforeEach(() => {
    loadMock.mockClear()
  })

  it('prefetches every channel except the current one', async () => {
    renderHook(() => useIdlePrefetch('meta-ads'))

    await waitFor(() => expect(loadMock).toHaveBeenCalled())

    const prefetched = loadMock.mock.calls.map((c) => c[0])
    expect(prefetched).toEqual(expect.arrayContaining(['zoho-crm', 'ga4', 'gsc', 'linkedin']))
    expect(prefetched).not.toContain('meta-ads')
  })

  it('prefetches all five channels when no current channel is given (e.g. Overview)', async () => {
    renderHook(() => useIdlePrefetch())

    await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(5))
  })

  it('a prefetch failure is swallowed, not thrown', async () => {
    loadMock.mockImplementationOnce(async () => {
      throw new Error('network down')
    })
    expect(() => renderHook(() => useIdlePrefetch('meta-ads'))).not.toThrow()
    await waitFor(() => expect(loadMock).toHaveBeenCalled())
  })
})
