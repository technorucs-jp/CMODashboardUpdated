/** Item 3.1 — the generic "no data at all for this channel" state (`Coverage` kind 'none' with no known history at all). */
export function EmptyState() {
  return (
    <div className="card" style={{ padding: 16 }} role="status">
      No data available for this channel yet.
    </div>
  )
}
