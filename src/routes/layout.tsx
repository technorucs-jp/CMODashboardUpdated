import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/shell/Sidebar'
import { TopBar } from '@/components/shell/TopBar'
import { useIdlePrefetch } from './useIdlePrefetch'

/**
 * Mounted once for the whole route tree (TAD §11.2/§0.7 — was Next.js's
 * `(dashboard)/layout.tsx`, now a react-router layout route) so sidebar/topbar
 * state survives navigation between tabs (item 0.14).
 *
 * The top bar and rail are fixed (see `.topbar`/`.sidebar` in index.css) rather
 * than flex children, so neither scrolls away on a long tab — which is what makes
 * "the pickers are visible on every tab" (item 2.4) actually true while reading
 * the bottom of a table, not just structurally true at the top of the page.
 */
export default function DashboardLayout() {
  // No specific channel to exclude here (item 2.7) — this mounts once for every
  // tab, not per-tab, so it prefetches all five; whichever tab the user actually
  // lands on will call `load()` for its own channel too, but `loader.ts`'s
  // in-flight dedup (item 1.21) means that's a join, not a second fetch.
  useIdlePrefetch()

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-shell-body">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
