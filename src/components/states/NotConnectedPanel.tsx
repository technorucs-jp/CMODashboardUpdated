/** Item 3.1 — Email's static "not yet connected" state (BRD §10) and SEO's backlinks
 *  placeholder (BRD §9.3) both use this; unaffected by range changes. */
export interface NotConnectedPanelProps {
  readonly message?: string
}

export function NotConnectedPanel({ message = 'Not yet connected.' }: NotConnectedPanelProps) {
  return (
    <div className="card" style={{ padding: 16 }} role="status">
      {message}
    </div>
  )
}
