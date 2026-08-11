import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { DonutChart } from './DonutChart'
import { HorizontalBarChart } from './HorizontalBarChart'

describe('DonutChart / HorizontalBarChart (item 2.13)', () => {
  it('DonutChart renders without throwing, given CSS-var colours', () => {
    expect(() =>
      render(
        <DonutChart
          data={[
            { name: 'Australia', value: 18432, color: 'var(--hue-blue)' },
            { name: 'India', value: 7173, color: 'var(--hue-green)' },
          ]}
        />,
      ),
    ).not.toThrow()
  })

  it('HorizontalBarChart renders without throwing, given CSS-var colours', () => {
    expect(() =>
      render(
        <HorizontalBarChart
          data={[
            { name: 'Const AU(11)', value: 22, color: 'var(--hue-blue)' },
            { name: 'BC 3 Emirates', value: 8, color: 'var(--hue-green)' },
          ]}
        />,
      ),
    ).not.toThrow()
  })
})
