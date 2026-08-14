import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionErrorBoundary } from './SectionErrorBoundary'

function BrokenChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test rendering crash')
  }
  return <div>Healthy component content</div>
}

describe('SectionErrorBoundary (item 5.15; TAD §11)', () => {
  it('renders child content normally when healthy', () => {
    render(
      <SectionErrorBoundary title="Campaign Chart">
        <BrokenChild shouldThrow={false} />
      </SectionErrorBoundary>,
    )

    expect(screen.getByText('Healthy component content')).toBeInTheDocument()
  })

  it('catches render error and displays isolated fallback alert without crashing parent', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <div>
        <div>Global Dashboard Header</div>
        <SectionErrorBoundary title="Broken Widget">
          <BrokenChild shouldThrow={true} />
        </SectionErrorBoundary>
        <div>Other Healthy Section</div>
      </div>,
    )

    expect(screen.getByText('Global Dashboard Header')).toBeInTheDocument()
    expect(screen.getByText('Other Healthy Section')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Error in Broken Widget/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
