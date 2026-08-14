import { Navigate, Route, Routes } from 'react-router-dom'
import { RoleGate } from '@/roles/RoleGate'
import DashboardLayout from './layout'
import OverviewPage from './overview'
import AdCampaignsPage from './adCampaigns'
import LeadsPage from './leads'
import WebsitePage from './website'
import SeoPage from './seo'
import EmailPage from './email'
import LinkedinPage from './linkedin'
import TotalLeadsPage from './totalLeads'

/**
 * The eight tabs (TASK.md §10) + `/` → `/overview` redirect.
 *
 * `RoleGate` (TAD ADR-015) replaces the old `AuthGuard` + `/login` route: the
 * launch dialog renders in place of the dashboard until a role is chosen, and
 * there is no ninth route to sign in at. Because the gate renders rather than
 * redirects, the requested URL survives the dialog — a bookmarked
 * `/leads?from=…&to=…` still resolves to that view after Continue (item 2.5).
 */
export function AppRoutes() {
  return (
    <RoleGate>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/ad-campaigns" element={<AdCampaignsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/website" element={<WebsitePage />} />
          <Route path="/seo" element={<SeoPage />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/linkedin" element={<LinkedinPage />} />
          <Route path="/total-leads" element={<TotalLeadsPage />} />
        </Route>
      </Routes>
    </RoleGate>
  )
}
