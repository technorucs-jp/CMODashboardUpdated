import { useState, type ReactNode } from 'react'

/**
 * Item 2.11 — sortable columns, totals row, `tabular-nums`, and its own
 * `overflow-x: auto` scroll container so a wide table never makes the page
 * body itself scroll sideways (verified at 1280px).
 *
 * `accessor` returns the *sort key* (a number for numeric columns); `render`
 * returns the pre-formatted display value — components never compute a
 * metric, but sorting numerically needs the raw number, not its formatted string.
 */
export interface DataTableColumn<T> {
  readonly key: string
  readonly label: string
  readonly accessor: (row: T) => number | string
  readonly render?: (row: T) => ReactNode
  readonly align?: 'left' | 'right'
}

export interface DataTableProps<T> {
  readonly columns: readonly DataTableColumn<T>[]
  readonly rows: readonly T[]
  readonly getRowKey: (row: T) => string
  /** Pre-formatted values keyed by column key — rendered as the final row. */
  readonly totals?: Readonly<Record<string, ReactNode>>
  readonly totalsLabel?: string
}

export function DataTable<T>({ columns, rows, getRowKey, totals, totalsLabel = 'Total' }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const sortedRows =
    sort === null
      ? rows
      : [...rows].sort((a, b) => {
          const column = columns.find((c) => c.key === sort.key)!
          const av = column.accessor(a)
          const bv = column.accessor(b)
          const cmp = av < bv ? -1 : av > bv ? 1 : 0
          return sort.direction === 'asc' ? cmp : -cmp
        })

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'desc' }
      return { key, direction: prev.direction === 'desc' ? 'asc' : 'desc' }
    })
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleSort(col.key)
                  }
                }}
                tabIndex={0}
                role="columnheader"
                aria-sort={sort?.key === col.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className={col.align === 'right' ? 'num' : undefined}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                {col.label}
                {sort?.key === col.key ? (sort.direction === 'asc' ? ' ▲' : ' ▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'num' : undefined}>
                  {col.render ? col.render(row) : col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && (
          <tfoot>
            <tr>
              {columns.map((col, i) => (
                <td key={col.key} className={col.align === 'right' ? 'num' : undefined}>
                  {i === 0 ? totalsLabel : (totals[col.key] ?? '')}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
