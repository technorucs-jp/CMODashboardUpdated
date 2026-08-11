import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CardSkeleton } from './CardSkeleton'

describe('CardSkeleton (item 2.8)', () => {
  it('renders a status role, not a blocking full-page element', () => {
    render(<CardSkeleton />)
    const el = screen.getByRole('status', { name: 'Loading' })
    expect(el).toBeInTheDocument()
    expect(el.className).toContain('skeleton')
  })

  it('accepts a height to roughly match the card it stands in for', () => {
    render(<CardSkeleton height={200} />)
    expect(screen.getByRole('status')).toHaveStyle({ height: '200px' })
  })
})
