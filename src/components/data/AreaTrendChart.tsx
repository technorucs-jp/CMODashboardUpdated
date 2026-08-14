import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface TrendPoint {
  readonly date: string
  readonly value: number
}

export interface AreaTrendChartProps {
  readonly data: readonly TrendPoint[]
  readonly ariaLabel: string
  readonly color?: string
  readonly height?: number
  readonly valueFormatter?: (v: number) => string
}

export function AreaTrendChart({
  data,
  ariaLabel,
  color = 'var(--accent-1)',
  height = 260,
  valueFormatter,
}: AreaTrendChartProps) {
  const chartData = data.map((d) => ({
    date: d.date.length > 5 ? d.date.slice(5) : d.date, // e.g. "06-01" or full date
    fullDate: d.date,
    value: d.value,
  }))

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: unknown) => [
              valueFormatter && typeof value === 'number' ? valueFormatter(value) : String(value ?? 0),
              'Sessions',
            ]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate ?? ''}
          />
          <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill="url(#areaGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
