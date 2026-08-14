import React, { Component, type ReactNode } from 'react'

export interface SectionErrorBoundaryProps {
  readonly title?: string
  readonly children: ReactNode
  readonly fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Section-level Error Boundary (item 5.15; TAD §11).
 *
 * Isolates runtime errors in individual charts, tables, or cards so that
 * a single failure never blanks an entire dashboard tab.
 */
export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log minimal telemetry without PII (item 5.21)
    console.error('[SectionErrorBoundary] Caught rendering error:', error.message, errorInfo.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          role="alert"
          aria-label="Section render error"
          style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--hue-red, #ef4444)',
            color: 'var(--text-primary)',
            margin: '12px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: 'var(--hue-red, #ef4444)' }}>
                {this.props.title ? `Error in ${this.props.title}` : 'Unable to display this section'}
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                A visual component encountered an issue. Other metrics remain fully functional.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid var(--color-border)',
                background: 'var(--surface-1)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
