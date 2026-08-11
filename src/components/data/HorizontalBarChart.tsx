import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from 'recharts'

/**
 * Item 2.13 — matches `07-adcampaigns-mid1.jpg`'s "Conversations started by ad
 * set" chart. Colours from CSS tokens (props), never library defaults or literal hex.
 */
export interface HorizontalBarDatum {
  readonly name: string
  readonly value: number
  /** A tokens.css CSS var, e.g. 'var(--accent-1)'. */
  readonly color: string
}

export interface HorizontalBarChartProps {
  readonly data: readonly HorizontalBarDatum[]
  readonly height?: number
}

export function HorizontalBarChart({ data, height = 280 }: HorizontalBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={[...data]} layout="vertical" margin={{ left: 24 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={140} />
        <Bar dataKey="value">
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
