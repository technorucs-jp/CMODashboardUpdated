import { describe, expect, it } from 'vitest'
import { convertLinkedInExport } from '../../scripts/linkedin/convert'

describe('LinkedIn Export Converter (items 5.8, 5.9, 5.11; TAD §9.4)', () => {
  it('is a pure function that converts in-memory sheets without fs/network', () => {
    const rawSheets = {
      visitors: [
        { Date: '2026-06-03', 'Page Views': 20, 'Unique Visitors': 15 },
        { Date: '2026-06-04', 'Page Views': 30, 'Unique Visitors': 25 },
      ],
      followers: [
        { Date: '2026-06-03', 'New Followers': 4 },
        { Date: '2026-06-04', 'New Followers': 6 },
      ],
      content: [
        {
          'Post ID': 'post-1',
          'Post Date': '2026-06-03',
          'Post Title': 'TechnoRUCS Dynamics 365 Cloud Migration',
          Impressions: 500,
          Clicks: 30,
          Reactions: 12,
          Comments: 3,
        },
      ],
      demographics: [
        { Category: 'Seniority', Label: 'Senior', Count: 45 },
        { Category: 'Seniority', Label: 'Entry', Count: 20 },
        { Category: 'Job Function', Label: 'Engineering', Count: 60 },
        { Category: 'Industry', Label: 'Information Technology', Count: 80 },
        { Category: 'Company Size', Label: '51-200 employees', Count: 50 },
      ],
    }

    const res = convertLinkedInExport(rawSheets)

    expect(res.data.dailyTrend).toHaveLength(2)
    expect(res.data.dailyTrend![0]).toEqual({
      date: '2026-06-03',
      newFollowers: 4,
      pageViews: 20,
      uniqueVisitors: 15,
      impressions: 500,
      clicks: 30,
      reactions: 12,
    })
    expect(res.data.posts).toHaveLength(1)
    expect(res.data.audience?.bySeniority).toHaveLength(2)
    expect(res.data.audience?.byJobFunction).toHaveLength(1)
  })

  it('item 5.9 — coverage is derived from actual min/max dates in sheets, not filename', () => {
    const rawSheets = {
      visitors: [
        { Date: '2026-06-03', 'Page Views': 10, 'Unique Visitors': 8 },
        { Date: '2026-06-28', 'Page Views': 15, 'Unique Visitors': 12 },
      ],
    }

    const res = convertLinkedInExport(rawSheets)
    expect(res.coverage).toEqual({
      from: '2026-06-03',
      to: '2026-06-28',
    })
  })
})
