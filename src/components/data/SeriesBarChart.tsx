import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * A vertical multi-series bar chart, stacked or grouped.
 *
 * Covers both of the Leads tab's charts with one component because they differ
 * only in that flag: the daily inbound volume (item 3.13) stacks its sources
 * into one bar per day, while contacted-vs-attempted by rep (item 3.15) puts
 * each status side by side. Recharts distinguishes the two purely by whether the
 * `<Bar>`s share a `stackId`, so a second component would be the same code with
 * one prop hardcoded.
 *
 * Colours come from CSS tokens via props — never library defaults, never a
 * literal hex on an SVG fill (item 2.13's rule).
 */
export interface SeriesBarSeries {
  /** Key into each row's `values` record. */
  readonly key: string
  readonly label: string
  /** A tokens.css CSS var, e.g. 'var(--accent-1)'. */
  readonly color: string
}

export interface SeriesBarRow {
  /** X-axis category — a date for the daily chart, a rep name for the per-rep one. */
  readonly category: string
  readonly values: Readonly<Record<string, number>>
}

export interface SeriesBarChartProps {
  readonly rows: readonly SeriesBarRow[]
  readonly series: readonly SeriesBarSeries[]
  /** True stacks the series into one bar per category; false puts them side by side. */
  readonly stacked?: boolean
  readonly height?: number
  /** Accessible name for the chart region. */
  readonly ariaLabel: string
}

export function SeriesBarChart({ rows, series, stacked = false, height = 280, ariaLabel }: SeriesBarChartProps) {
  // Recharts wants one flat object per row: { category, [seriesKey]: value, ... }
  const data = rows.map((row) => ({
    category: row.category,
    ...Object.fromEntries(series.map((s) => [s.key, row.values[s.key] ?? 0])),
  }))

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="category" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
