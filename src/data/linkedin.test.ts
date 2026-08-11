import { describe, expect, it } from 'vitest'
import { linkedInFileSchema, linkedInUploadSchema, linkedInPostSchema, linkedInCompetitorSchema } from './schemas'

const validUpload = {
  coversFrom: '2026-06-01',
  coversTo: '2026-06-30',
  uploadedAt: '2026-07-02T09:40:00+05:30',
  fileType: 'followers+visitors+content',
}

const validFile = {
  schemaVersion: 1,
  meta: {
    channel: 'linkedin',
    lastSyncedAt: '2026-07-02T10:00:00+05:30',
    earliestRecordDate: '2026-06-01',
    latestRecordDate: '2026-06-30',
    syncSource: 'Manual XLS upload',
    coworkRunId: 'run_2026-07-02T1000',
    rowCounts: { posts: 1 },
    uploads: [validUpload],
  },
  dailyTrend: [{ date: '2026-06-01', newFollowers: 3, pageViews: 78, uniqueVisitors: 26, impressions: 1385, clicks: 129, reactions: 45 }],
  posts: [
    {
      postId: 'urn:li:1',
      date: '2026-06-01',
      title: 'Chennai Salesforce Trailblazer Community Meetup',
      impressions: 3353,
      clicks: 1385,
      reactions: 129,
      comments: 0,
      videoViews: null,
    },
  ],
  audience: {
    bySeniority: [{ level: 'Senior', count: 1789 }],
    byJobFunction: [{ function: 'Engineering', count: 1389 }],
    byVisitorIndustry: [{ industry: 'IT Services', count: 500 }],
    byCompanySize: [{ companySize: '51-200', count: 300 }],
  },
  competitors: [{ page: 'BytesTechnolab — HR', newFollowers: 15, posts: 1, comments: 0, reactions: 15 }],
}

describe('linkedInFileSchema (item 1.7)', () => {
  it('parses a well-formed file', () => {
    expect(linkedInFileSchema.safeParse(validFile).success).toBe(true)
  })

  it('rejects meta.uploads[] with coversFrom after coversTo', () => {
    const badUpload = { ...validUpload, coversFrom: '2026-07-15', coversTo: '2026-07-01' }
    expect(linkedInUploadSchema.safeParse(badUpload).success).toBe(false)
  })

  it('rejects a post with a stored engagementRate or ctr (P1)', () => {
    expect(linkedInPostSchema.safeParse({ ...validFile.posts[0], engagementRate: 0.452 }).success).toBe(false)
    expect(linkedInPostSchema.safeParse({ ...validFile.posts[0], ctr: 0.413 }).success).toBe(false)
  })

  it('rejects a competitor with a stored reactionsPerPost (P1)', () => {
    const withRatio = { ...validFile.competitors[0], reactionsPerPost: 15.0 }
    expect(linkedInCompetitorSchema.safeParse(withRatio).success).toBe(false)
  })
})
