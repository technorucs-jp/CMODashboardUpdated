import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BarRow } from './BarRow'

describe('BarRow (item 2.12)', () => {
  it('matches 02-leads-top.jpg\'s inbound-sources pattern: label, value+share, proportional bar', () => {
    render(<BarRow label="Meta Ads" value="48 (98%)" sharePercent={98} color="var(--accent-1)" />)
    expect(screen.getByText('Meta Ads')).toBeInTheDocument()
    expect(screen.getByText('48 (98%)')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Meta Ads' })).toHaveAttribute('aria-valuenow', '98')
  })

  it('a tiny share (SEO, 2%) still renders a visible bar and correct value', () => {
    render(<BarRow label="SEO" value="1 (2%)" sharePercent={2} color="var(--accent-4)" />)
    expect(screen.getByRole('progressbar', { name: 'SEO' })).toHaveAttribute('aria-valuenow', '2')
  })

  it('clamps sharePercent into [0, 100] rather than overflowing the bar', () => {
    render(<BarRow label="Edge case" value="x" sharePercent={150} color="var(--accent-1)" />)
    const bar = screen.getByRole('progressbar').firstElementChild as HTMLElement
    expect(bar.style.width).toBe('100%')
  })
})
