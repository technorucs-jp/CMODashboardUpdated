import { describe, expect, it } from 'vitest'
import { zohoCrmFileSchema, zohoLeadSchema } from './schemas'

const validLead = {
  leadId: '4876',
  createdTime: '2026-06-03T11:42:00+05:30',
  leadSource: 'Meta Ads',
  leadStatus: 'Attempted to Contact',
  owner: 'Gopinath',
  inquiryType: null,
}

const validFile = {
  schemaVersion: 1,
  meta: {
    channel: 'zoho-crm',
    lastSyncedAt: '2026-08-10T09:03:11+05:30',
    earliestRecordDate: '2026-05-01',
    latestRecordDate: '2026-08-09',
    syncSource: 'Zoho CRM',
    coworkRunId: 'run_2026-08-10T0900',
    rowCounts: { leads: 1 },
  },
  leads: [validLead],
}

describe('zohoLeadSchema / zohoCrmFileSchema (item 1.4)', () => {
  it('parses a well-formed lead', () => {
    expect(zohoLeadSchema.safeParse(validLead).success).toBe(true)
  })

  it('rejects Partner as a lead source — excluded at ingestion, must never appear', () => {
    const partnerLead = { ...validLead, leadSource: 'Partner' }
    expect(zohoLeadSchema.safeParse(partnerLead).success).toBe(false)
  })

  it('rejects Referral and ZoomInfo too', () => {
    for (const source of ['Referral', 'ZoomInfo']) {
      expect(zohoLeadSchema.safeParse({ ...validLead, leadSource: source }).success).toBe(false)
    }
  })

  it('rejects a lead with a notes field of any kind (P3′ / ADR-012)', () => {
    const withNotes = { ...validLead, notes: 'How does the software work for multiple sites?' }
    expect(zohoLeadSchema.safeParse(withNotes).success).toBe(false)
  })

  it('accepts a nullable inquiryType as a bucket label, never raw text', () => {
    expect(zohoLeadSchema.safeParse({ ...validLead, inquiryType: 'demo-request' }).success).toBe(true)
  })

  it('parses a well-formed file with a Partner lead rejected at the array level', () => {
    const fileWithPartner = { ...validFile, leads: [validLead, { ...validLead, leadId: '999', leadSource: 'Partner' }] }
    expect(zohoCrmFileSchema.safeParse(fileWithPartner).success).toBe(false)
    expect(zohoCrmFileSchema.safeParse(validFile).success).toBe(true)
  })
})
