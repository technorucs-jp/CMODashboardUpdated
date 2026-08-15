import type { CSSProperties } from 'react'
import { NotConnectedPanel } from '@/components/states/NotConnectedPanel'

/**
 * Email tab — Instantly.ai email marketing (item 3.34). BRD §10.
 *
 * Renders an explicit static "not yet connected" state, unaffected by range changes.
 */
export default function EmailPage() {
  return (
    <div className="page" style={{ '--page-accent': 'var(--accent-6)' } as CSSProperties}>
      <h1 className="page-title">Email</h1>
      <p>Instantly.ai · Cold Outreach & Campaign Analytics</p>

      <div style={{ marginTop: 24, maxWidth: 640 }}>
        <NotConnectedPanel message="Instantly.ai email integration is not yet connected. Connect your Instantly.ai workspace to track open rates, reply rates, and meeting conversions." />
      </div>
    </div>
  )
}
