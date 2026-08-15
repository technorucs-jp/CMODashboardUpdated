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
    <header className="topbar">
      {/* The subtitle sits outside the <h1> deliberately: it would otherwise be
          folded into the heading's accessible name ("TechnoRUCS CMO Dashboard"),
          which is both a worse label for a screen reader and a silent break of
          the layout test's `getByRole('heading', { name: 'TechnoRUCS' })`. */}
      <div className="topbar-brand">
        <h1 className="topbar-brand-name">TechnoRUCS</h1>
        <span className="topbar-brand-sub">CMO Dashboard</span>
      </div>
      <div className="topbar-controls">
        <DateRangePicker value={range} today={today} onChange={setRange} />
        <ComparisonRangePicker primaryRange={range} comparisonRange={comparisonRange} onChange={setComparisonRange} />
      </div>
    </header>
  )
}
