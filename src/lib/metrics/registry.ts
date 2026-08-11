/**
 * The metric registry (TAD ADR-007). Appendix A's "moved unfavourably" is
 * undefined without an explicit polarity per metric — cost/conversation rising
 * is bad, sessions rising is good, and getting this wrong at any of the ~40
 * call sites that need it is the difference between a dashboard that's trusted
 * and one that's spot-checked. Status, colour, arrow direction, and number
 * formatting all derive from this one place.
 */

export type Polarity = 'higher-better' | 'lower-better' | 'neutral'
export type MetricFormat = 'currency' | 'integer' | 'percent' | 'decimal' | 'duration' | 'score'

export interface MetricDefinition {
  readonly id: string
  readonly label: string
  readonly unit: string
  readonly polarity: Polarity
  /** false for metrics de-duplicated by the source platform (TAD §9.2) — reach, totalUsers. */
  readonly additive: boolean
  readonly format: MetricFormat
}

export const registry = {
  // --- Meta Ads ---
  'meta.spend': { id: 'meta.spend', label: 'Ad Spend', unit: '₹', polarity: 'neutral', additive: true, format: 'currency' },
  'meta.impressions': { id: 'meta.impressions', label: 'Impressions', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'meta.reach': { id: 'meta.reach', label: 'Reach', unit: '', polarity: 'higher-better', additive: false, format: 'integer' },
  'meta.clicks': { id: 'meta.clicks', label: 'Clicks', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'meta.conversations': { id: 'meta.conversations', label: 'Conversations', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'meta.cpc': { id: 'meta.cpc', label: 'Avg. CPC', unit: '₹', polarity: 'lower-better', additive: false, format: 'currency' },
  'meta.cpm': { id: 'meta.cpm', label: 'CPM', unit: '₹', polarity: 'lower-better', additive: false, format: 'currency' },
  'meta.ctr': { id: 'meta.ctr', label: 'CTR', unit: '%', polarity: 'higher-better', additive: false, format: 'percent' },
  'meta.frequency': { id: 'meta.frequency', label: 'Frequency', unit: '×', polarity: 'neutral', additive: false, format: 'decimal' },
  'meta.costPerConversation': { id: 'meta.costPerConversation', label: 'Cost/Conversation', unit: '₹', polarity: 'lower-better', additive: false, format: 'currency' },
  'meta.opportunityScore': { id: 'meta.opportunityScore', label: 'Opportunity Score', unit: '', polarity: 'higher-better', additive: false, format: 'score' },

  // --- Zoho CRM ---
  'zoho.totalInbound': { id: 'zoho.totalInbound', label: 'Total Inbound Leads', unit: '', polarity: 'neutral', additive: true, format: 'integer' },
  'zoho.contactRate': { id: 'zoho.contactRate', label: 'Contact Rate', unit: '%', polarity: 'higher-better', additive: false, format: 'percent' },
  'zoho.contacted': { id: 'zoho.contacted', label: 'Contacted', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'zoho.attempted': { id: 'zoho.attempted', label: 'Attempted to Contact', unit: '', polarity: 'neutral', additive: true, format: 'integer' },
  'zoho.lost': { id: 'zoho.lost', label: 'Lost / Not interested', unit: '', polarity: 'lower-better', additive: true, format: 'integer' },
  'zoho.contactInFuture': { id: 'zoho.contactInFuture', label: 'Contact in Future', unit: '', polarity: 'neutral', additive: true, format: 'integer' },
  'zoho.junk': { id: 'zoho.junk', label: 'Junk', unit: '', polarity: 'neutral', additive: true, format: 'integer' },
  'zoho.meetingsScheduled': { id: 'zoho.meetingsScheduled', label: 'Meetings Scheduled', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },

  // --- GA4 ---
  'ga4.totalUsers': { id: 'ga4.totalUsers', label: 'Total Users', unit: '', polarity: 'higher-better', additive: false, format: 'integer' },
  'ga4.sessions': { id: 'ga4.sessions', label: 'Sessions', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'ga4.screenPageViews': { id: 'ga4.screenPageViews', label: 'Page Views', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'ga4.engagedSessions': { id: 'ga4.engagedSessions', label: 'Engaged Sessions', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'ga4.engagementRate': { id: 'ga4.engagementRate', label: 'Engagement Rate', unit: '%', polarity: 'higher-better', additive: false, format: 'percent' },
  'ga4.bounceRate': { id: 'ga4.bounceRate', label: 'Bounce Rate', unit: '%', polarity: 'lower-better', additive: false, format: 'percent' },
  'ga4.avgSessionDuration': { id: 'ga4.avgSessionDuration', label: 'Avg. Session Duration', unit: 's', polarity: 'higher-better', additive: false, format: 'duration' },
  'ga4.pagesPerSession': { id: 'ga4.pagesPerSession', label: 'Pages / Session', unit: '', polarity: 'higher-better', additive: false, format: 'decimal' },

  // --- GSC ---
  'gsc.clicks': { id: 'gsc.clicks', label: 'Clicks', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'gsc.impressions': { id: 'gsc.impressions', label: 'Impressions', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'gsc.ctr': { id: 'gsc.ctr', label: 'Avg. CTR', unit: '%', polarity: 'higher-better', additive: false, format: 'percent' },
  'gsc.avgPosition': { id: 'gsc.avgPosition', label: 'Avg. Position', unit: '', polarity: 'lower-better', additive: false, format: 'decimal' },
  'gsc.brandClickShare': { id: 'gsc.brandClickShare', label: 'Brand Click Share', unit: '%', polarity: 'neutral', additive: false, format: 'percent' },
  'gsc.nonBrandClicks': { id: 'gsc.nonBrandClicks', label: 'Non-brand Clicks', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },

  // --- LinkedIn ---
  'linkedin.newFollowers': { id: 'linkedin.newFollowers', label: 'New Followers', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'linkedin.pageViews': { id: 'linkedin.pageViews', label: 'Page Views', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'linkedin.uniqueVisitors': { id: 'linkedin.uniqueVisitors', label: 'Unique Visitors', unit: '', polarity: 'higher-better', additive: false, format: 'integer' },
  'linkedin.impressions': { id: 'linkedin.impressions', label: 'Impressions', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'linkedin.clicks': { id: 'linkedin.clicks', label: 'Clicks', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'linkedin.reactions': { id: 'linkedin.reactions', label: 'Reactions', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'linkedin.comments': { id: 'linkedin.comments', label: 'Comments', unit: '', polarity: 'higher-better', additive: true, format: 'integer' },
  'linkedin.postsPublished': { id: 'linkedin.postsPublished', label: 'Posts Published', unit: '', polarity: 'neutral', additive: true, format: 'integer' },
  'linkedin.engagementRate': { id: 'linkedin.engagementRate', label: 'Engagement Rate', unit: '%', polarity: 'higher-better', additive: false, format: 'percent' },
  'linkedin.reactionsPerPost': { id: 'linkedin.reactionsPerPost', label: 'Reactions/Post', unit: '', polarity: 'higher-better', additive: false, format: 'decimal' },
} as const satisfies Record<string, MetricDefinition>

export type MetricId = keyof typeof registry
