/**
 * Client-Side Telemetry & Analytics (item 5.21; TAD ADR-012, §16.4).
 *
 * Captures route changes, filter interactions, and rendering errors.
 * STRICT PRIVACY INVARIANT: NEVER captures lead names, email addresses, phone numbers,
 * notes, or customer inquiry text. Logs channel ID + date range signature only.
 */

export interface TelemetryEvent {
  readonly eventName: string
  readonly channel?: string
  readonly rangeSignature?: string
  readonly durationMs?: number
  readonly errorSnippet?: string
}

export function trackEvent(event: TelemetryEvent): void {
  // In production, delegates to window.va or analytics endpoint
  if (typeof window !== 'undefined' && (window as unknown as { va?: (name: string, data: Record<string, unknown>) => void }).va) {
    (window as unknown as { va: (name: string, data: Record<string, unknown>) => void }).va(event.eventName, {
      channel: event.channel,
      range: event.rangeSignature,
      durationMs: event.durationMs,
      error: event.errorSnippet ? event.errorSnippet.slice(0, 100) : undefined,
    })
  } else if (process.env.NODE_ENV === 'development') {
    // Development console logging for observability
    // console.debug('[Telemetry]', event.eventName, event)
  }
}

export function trackPageView(pathname: string, search: string): void {
  trackEvent({
    eventName: 'page_view',
    channel: pathname.replace(/^\//, '') || 'overview',
    rangeSignature: search,
  })
}
