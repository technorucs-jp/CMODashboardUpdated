import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusTag } from './StatusTag'
import type { Status } from '@/lib/metrics/status'

describe('StatusTag (item 2.10)', () => {
  const CASES: [Status, string][] = [
    ['leading', 'Leading'],
    ['good', 'Good'],
    ['monitor', 'Monitor'],
    ['action-needed', 'Action needed'],
  ]

  it.each(CASES)('renders the %s variant with its text label present, not colour-only', (status, label) => {
    render(<StatusTag status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('all four variants render distinctly in one pass', () => {
    render(
      <>
        {CASES.map(([status]) => (
          <StatusTag key={status} status={status} />
        ))}
      </>,
    )
    for (const [, label] of CASES) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
