/**
 * Item 3.1 — GSC's permanent reporting lag (BRD §9, TAD §7.2). This is a
 * banner alongside real data, not a blocking state (item 1.19's `isRenderable`
 * treats 'lagging' as renderable) — the `DataAsOfBanner` (item 3.29) is the
 * headline version of this same idea for the SEO tab specifically; this is
 * the generic shared component any tab could use for the same purpose.
 */
export interface LaggingDataNoticeProps {
  readonly dataAsOf: string
}

export function LaggingDataNotice({ dataAsOf }: LaggingDataNoticeProps) {
  return (
    <div role="status" style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
      Data as of {dataAsOf}.
    </div>
  )
}
