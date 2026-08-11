import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangePicker } from './DateRangePicker'

const TODAY = '2026-08-10'

describe('DateRangePicker (item 2.1)', () => {
  it('renders the selected range and all seven presets', () => {
    render(<DateRangePicker value={{ from: '2026-08-01', to: '2026-08-10' }} today={TODAY} onChange={() => {}} />)
    expect(screen.getByLabelText('Selected range')).toHaveTextContent('2026-08-01 – 2026-08-10')
    for (const label of ['Today', 'Last 7 days', 'Last 30 days', 'This Month', 'Last Month', 'This Quarter', 'Custom']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('selecting "Last Month" on 2026-08-10 calls onChange with 2026-07-01..2026-07-31', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: '2026-08-01', to: '2026-08-10' }} today={TODAY} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Last Month' }))
    expect(onChange).toHaveBeenCalledWith({ from: '2026-07-01', to: '2026-07-31' }, 'last-month')
  })

  it('clicking "Custom" opens the calendar instead of calling onChange directly', () => {
    const onChange = vi.fn()
    render(<DateRangePicker value={{ from: '2026-08-01', to: '2026-08-10' }} today={TODAY} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))
    expect(onChange).not.toHaveBeenCalled()
    // The calendar grid should now be present.
    expect(document.querySelector('.rdp-root, [data-slot="calendar"], table')).toBeTruthy()
  })
})
