import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { DataTable, type DataTableColumn } from './DataTable'

interface AdSetRow {
  readonly name: string
  readonly spend: number
  readonly costPerConv: number | null
}

const ROWS: AdSetRow[] = [
  { name: 'Construction Co. Australia', spend: 9255.62, costPerConv: 420.71 },
  { name: 'BC Australia — Video', spend: 1615.67, costPerConv: null },
  { name: 'Business Central — Australia (17 Jun)', spend: 1923.21, costPerConv: 1923.21 },
]

const COLUMNS: DataTableColumn<AdSetRow>[] = [
  { key: 'name', label: 'Ad set / campaign', accessor: (r) => r.name },
  { key: 'spend', label: 'Spend (₹)', accessor: (r) => r.spend, align: 'right' },
  {
    key: 'costPerConv',
    label: 'Cost/conv (₹)',
    accessor: (r) => r.costPerConv ?? Infinity,
    render: (r) => (r.costPerConv === null ? '—' : r.costPerConv.toFixed(2)),
    align: 'right',
  },
]

function getBodyNameColumn() {
  return within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row').map((row) => within(row).getAllByRole('cell')[0].textContent)
}

describe('DataTable (item 2.11)', () => {
  it('renders rows and a totals row', () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        getRowKey={(r) => r.name}
        totals={{ spend: '12,794.50', costPerConv: '' }}
        totalsLabel="Total (active ad sets)"
      />,
    )
    expect(screen.getByText('12,794.50')).toBeInTheDocument()
    expect(screen.getByText('Total (active ad sets)')).toBeInTheDocument()
  })

  it('sorts by spend when the Spend header is clicked', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.name} />)
    fireEvent.click(screen.getByRole('columnheader', { name: /Spend/ }))
    // Descending by default on first click — highest spend first.
    expect(getBodyNameColumn()[0]).toBe('Construction Co. Australia')

    fireEvent.click(screen.getByRole('columnheader', { name: /Spend/ }))
    // Second click reverses to ascending.
    expect(getBodyNameColumn()[0]).toBe('BC Australia — Video')
  })

  it('sorts by cost/conversation, treating null (—) as the highest value', () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.name} />)
    fireEvent.click(screen.getByRole('columnheader', { name: /Cost\/conv/ }))
    // Descending: null (Infinity) sorts first, then 1923.21, then 420.71.
    const order = getBodyNameColumn()
    expect(order[0]).toBe('BC Australia — Video')
    expect(order[1]).toBe('Business Central — Australia (17 Jun)')
  })

  it('lives inside its own overflow-x:auto container, not the page body', () => {
    const { container } = render(<DataTable columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.name} />)
    expect(container.firstChild).toHaveStyle({ overflowX: 'auto' })
  })
})
