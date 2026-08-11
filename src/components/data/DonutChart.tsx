import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

/**
 * Item 2.13 — colours read from CSS tokens (props), never library defaults or
 * a literal hex value hardcoded onto an SVG fill.
 */
export interface DonutSlice {
  readonly name: string
  readonly value: number
  /** A tokens.css CSS var, e.g. 'var(--accent-1)'. */
  readonly color: string
}

export interface DonutChartProps {
  readonly data: readonly DonutSlice[]
  readonly height?: number
}

export function DonutChart({ data, height = 240 }: DonutChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={[...data]} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%">
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
