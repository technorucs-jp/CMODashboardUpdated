import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { businessDateFromCalendarDate, calendarDateFromBusinessDate } from '@/lib/time/businessDate'
import { previousMonth, previousPeriodOfEqualLength, previousYear, type DateRange } from '@/lib/time/range'

/**
 * BRD §4.1's "Compare to" control — off by default (item 2.2). Controlled,
 * same pattern as `DateRangePicker`: no internal range state, only the
 * transient "is the custom calendar open" UI state.
 */
export type ComparisonOption = 'off' | 'previous-period' | 'previous-month' | 'previous-year' | 'custom'

export interface ComparisonRangePickerProps {
  readonly primaryRange: DateRange
  readonly comparisonRange: DateRange | null
  readonly onChange: (range: DateRange | null, option: ComparisonOption) => void
}

const OPTION_LABELS: { id: ComparisonOption; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'previous-period', label: 'Previous period' },
  { id: 'previous-month', label: 'Previous month' },
  { id: 'previous-year', label: 'Previous year' },
  { id: 'custom', label: 'Custom' },
]

export function ComparisonRangePicker({ primaryRange, comparisonRange, onChange }: ComparisonRangePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  function handleOptionClick(option: ComparisonOption) {
    switch (option) {
      case 'off':
        onChange(null, 'off')
        setCalendarOpen(false)
        return
      case 'previous-period':
        onChange(previousPeriodOfEqualLength(primaryRange), 'previous-period')
        setCalendarOpen(false)
        return
      case 'previous-month':
        onChange(previousMonth(primaryRange), 'previous-month')
        setCalendarOpen(false)
        return
      case 'previous-year':
        onChange(previousYear(primaryRange), 'previous-year')
        setCalendarOpen(false)
        return
      case 'custom':
        setCalendarOpen(true)
        return
    }
  }

  function handleCalendarSelect(range: { from?: Date; to?: Date } | undefined) {
    if (range?.from && range?.to) {
      onChange(
        { from: businessDateFromCalendarDate(range.from), to: businessDateFromCalendarDate(range.to) },
        'custom',
      )
      setCalendarOpen(false)
    }
  }

  return (
    <div>
      <span>Compare to</span>
      <div role="group" aria-label="Comparison range options">
        {OPTION_LABELS.map((o) => (
          <button key={o.id} type="button" onClick={() => handleOptionClick(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
      {comparisonRange && (
        <span aria-label="Selected comparison range">
          {comparisonRange.from} – {comparisonRange.to}
        </span>
      )}
      {calendarOpen && (
        <DayPicker
          mode="range"
          selected={
            comparisonRange
              ? { from: calendarDateFromBusinessDate(comparisonRange.from), to: calendarDateFromBusinessDate(comparisonRange.to) }
              : undefined
          }
          onSelect={handleCalendarSelect}
        />
      )}
    </div>
  )
}
