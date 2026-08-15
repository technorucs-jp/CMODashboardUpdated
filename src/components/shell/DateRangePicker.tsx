import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/style.css'
import { businessDateFromCalendarDate, calendarDateFromBusinessDate, type BusinessDate } from '@/lib/time/businessDate'
import { computePreset, type PresetId } from '@/lib/time/presets'
import type { DateRange } from '@/lib/time/range'

/**
 * BRD §4.1's calendar picker + seven presets (item 2.1). Controlled by the
 * parent — no internal range state, only the transient "is the popover open"
 * UI state — because `TopBar` owns the actual range via the URL (item 2.3's
 * "no duplicate range state in React").
 */
const PRESET_LABELS: { id: PresetId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'last-7-days', label: 'Last 7 days' },
  { id: 'last-30-days', label: 'Last 30 days' },
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'this-quarter', label: 'This Quarter' },
  { id: 'custom', label: 'Custom' },
]

export interface DateRangePickerProps {
  readonly value: DateRange
  readonly today: BusinessDate
  readonly onChange: (range: DateRange, preset: PresetId) => void
}

export function DateRangePicker({ value, today, onChange }: DateRangePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false)

  function handlePresetClick(presetId: PresetId) {
    if (presetId === 'custom') {
      setCalendarOpen(true)
      return
    }
    const range = computePreset(presetId, today)
    if (range) {
      onChange(range, presetId)
    }
    setCalendarOpen(false)
  }

  function handleCalendarSelect(range: { from?: Date; to?: Date } | undefined) {
    if (range?.from && range?.to) {
      onChange(
        {
          from: businessDateFromCalendarDate(range.from),
          to: businessDateFromCalendarDate(range.to),
        },
        'custom',
      )
      setCalendarOpen(false)
    }
  }

  return (
    <div className="picker">
      <div className="picker-group" role="group" aria-label="Date range presets">
        {PRESET_LABELS.map((p) => (
          <button key={p.id} className="picker-btn" type="button" onClick={() => handlePresetClick(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <span className="picker-value" aria-label="Selected range">
        {value.from} – {value.to}
      </span>
      {calendarOpen && (
        <div className="picker-calendar">
          <DayPicker
            mode="range"
            selected={{ from: calendarDateFromBusinessDate(value.from), to: calendarDateFromBusinessDate(value.to) }}
            onSelect={handleCalendarSelect}
          />
        </div>
      )}
    </div>
  )
}
