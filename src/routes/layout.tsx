import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/shell/Sidebar'
import { TopBar } from '@/components/shell/TopBar'

/**
 * Mounted once for the whole authenticated tree (TAD §11.2/§0.7 — was Next.js's
 * `(dashboard)/layout.tsx`, now a react-router layout route) so sidebar/topbar state
 * survives navigation between tabs (item 0.14).
 */
export default function DashboardLayout() {
  return (
    <div>
      <TopBar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
