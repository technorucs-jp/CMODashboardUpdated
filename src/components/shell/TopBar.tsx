import { useRangeState } from '@/routes/useRangeState'
import { DateRangePicker } from './DateRangePicker'
import { ComparisonRangePicker } from './ComparisonRangePicker'

/**
 * TAD §11.6 — both pickers live here (item 2.4), visible on every tab and
 * surviving navigation because `TopBar` is part of the layout route mounted
 * once (item 0.14), not per-page. Range state itself lives in the URL
 * (`useRangeState`, item 2.3) — this component only renders the controls.
 */
export function TopBar() {
  const { range, comparisonRange, today, setRange, setComparisonRange } = useRangeState()

  return (
    <header>
      <h1>TechnoRUCS</h1>
      <span>CMO Dashboard</span>
      <DateRangePicker value={range} today={today} onChange={setRange} />
      <ComparisonRangePicker primaryRange={range} comparisonRange={comparisonRange} onChange={setComparisonRange} />
    </header>
  )
}
