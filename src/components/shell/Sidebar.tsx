import { NavLink } from 'react-router-dom'

/**
 * Fixed left nav, 8 items + source sublabels (TAD §11.6 / CHECKLIST.md 0.14).
 * Matches Wireframe/01-overview-june-a.jpg's channel list.
 */
const NAV_ITEMS = [
  { to: '/overview', label: 'Overview', source: null },
  { to: '/ad-campaigns', label: 'Ad Campaigns', source: 'Meta' },
  { to: '/leads', label: 'Leads', source: 'Zoho' },
  { to: '/website', label: 'Website', source: 'GA4' },
  { to: '/seo', label: 'SEO', source: 'GSC' },
  { to: '/email', label: 'Email', source: 'Instantly' },
  { to: '/linkedin', label: 'LinkedIn', source: 'Page' },
  { to: '/total-leads', label: 'Total Leads', source: 'Meta' },
] as const

export function Sidebar() {
  return (
    <nav aria-label="Channels">
      <p>Channels</p>
      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to}>
              <span>{item.label}</span>
              {item.source && (
                <>
                  {' '}
                  <span>{item.source}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
