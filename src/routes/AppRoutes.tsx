import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthGuard } from '@/auth/AuthGuard'
import DashboardLayout from './layout'
import LoginPage from './login'
import OverviewPage from './overview'
import AdCampaignsPage from './adCampaigns'
import LeadsPage from './leads'
import WebsitePage from './website'
import SeoPage from './seo'
import EmailPage from './email'
import LinkedinPage from './linkedin'
import TotalLeadsPage from './totalLeads'

/**
 * The eight tabs (TASK.md §10) + `/login` + `/` → `/overview` redirect. Every
 * protected route is wrapped by `AuthGuard` via the shared layout route — there is
 * no server middleware to do this once for all paths (item 0.15).
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        }
      >
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
  )
}
