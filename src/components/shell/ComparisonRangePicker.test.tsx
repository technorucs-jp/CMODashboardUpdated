import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ComparisonRangePicker } from './ComparisonRangePicker'

describe('ComparisonRangePicker (item 2.2)', () => {
  it('is off by default and shows no comparison range', () => {
    render(<ComparisonRangePicker primaryRange={{ from: '2026-06-01', to: '2026-06-30' }} comparisonRange={null} onChange={() => {}} />)
    expect(screen.queryByLabelText('Selected comparison range')).not.toBeInTheDocument()
  })

  it('enabling "Previous period" for 1-30 June sets cf=2026-05-02&ct=2026-05-31', () => {
    const onChange = vi.fn()
    render(<ComparisonRangePicker primaryRange={{ from: '2026-06-01', to: '2026-06-30' }} comparisonRange={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Previous period' }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-05-02', to: '2026-05-31' }, 'previous-period')
  })

  it('"Previous month" and "Previous year" delegate to the range.ts helpers', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ComparisonRangePicker primaryRange={{ from: '2026-06-01', to: '2026-06-30' }} comparisonRange={null} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-05-01', to: '2026-05-30' }, 'previous-month')

    rerender(<ComparisonRangePicker primaryRange={{ from: '2026-06-01', to: '2026-06-30' }} comparisonRange={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Previous year' }))
    expect(onChange).toHaveBeenLastCalledWith({ from: '2025-06-01', to: '2025-06-30' }, 'previous-year')
  })

  it('"Off" clears the comparison', () => {
    const onChange = vi.fn()
    render(
      <ComparisonRangePicker
        primaryRange={{ from: '2026-06-01', to: '2026-06-30' }}
        comparisonRange={{ from: '2026-05-02', to: '2026-05-31' }}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Off' }))
    expect(onChange).toHaveBeenCalledWith(null, 'off')
  })
})
