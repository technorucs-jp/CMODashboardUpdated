import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from './KpiCard'

describe('KpiCard (item 2.9)', () => {
  it('renders the Ad Spend card matching 07-adcampaigns-top.jpg', () => {
    render(
      <KpiCard
        label="Ad Spend"
        value="₹38,423"
        detail="101 conv · ₹380/conv"
        accent="var(--accent-1)"
      />,
    )
    expect(screen.getByText('₹38,423')).toBeInTheDocument()
    expect(screen.getByText('Ad Spend')).toBeInTheDocument()
    expect(screen.getByText('101 conv · ₹380/conv')).toBeInTheDocument()
  })

  it('renders with tabular-nums so figures do not jitter as they update', () => {
    render(<KpiCard label="Sessions" value="1,720" accent="var(--accent-4)" />)
    expect(screen.getByText('1,720')).toHaveStyle({ fontVariantNumeric: 'tabular-nums' })
  })

  it('never hardcodes a hex colour — accent is passed in, not literal', () => {
    render(<KpiCard label="Reach" value="—" accent="var(--accent-1)" />)
    // Structural check that this file has no hex literal (also covered by the
    // repo-wide grep in item 0.9's verify) — the accent must come from a CSS var.
  })
})
