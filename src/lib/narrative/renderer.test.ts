import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Flag } from '../rules/types'
import { renderFlagNarrative } from './renderer'
import { DEFAULT_TEMPLATES } from './templates'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'tests', 'fixtures')
const narrativesFile = JSON.parse(readFileSync(join(FIXTURES_DIR, 'narratives.json'), 'utf8'))

describe('Narrative Renderer & Templates (items 4.14, 4.15, 4.16; TAD §10.2)', () => {
  const sampleFlag: Flag = {
    id: 'meta.adset.cost-per-conv-outlier',
    channel: 'meta-ads',
    severity: 'critical',
    tier: 'immediate',
    subject: 'Business Central — Australia (17 Jun)',
    values: {
      costPerConv: 1923.21,
      multiple: 4.6,
      spend: 1923.21,
      conversations: 1,
      region: 'Australia',
    },
    ruleVersion: 1,
  }

  it('item 4.14 — every rule has a default template that renders complete sentences without narratives.json', () => {
    const ruleIds = [
      'meta.adset.cost-per-conv-outlier',
      'meta.adset.spend-no-conversions',
      'meta.adset.audience-overlap',
      'zoho.status.stuck-in-attempted',
      'zoho.owner.concentration',
      'zoho.meetings.zero',
      'ga4.paid.no-attribution',
      'ga4.country.suspected-bot',
      'gsc.brand-dominance',
      'gsc.zero-click-opportunity',
      'linkedin.coverage.competitor-lead',
      'channel.status.degraded',
    ]

    for (const id of ruleIds) {
      expect(DEFAULT_TEMPLATES[id]).toBeDefined()
      const rendered = renderFlagNarrative({
        ...sampleFlag,
        id,
      })
      expect(rendered.headline).toBeTruthy()
      expect(rendered.body).toBeTruthy()
    }
  })

  it('item 4.15 — placeholder renderer formats currency, thousands separators, and pluralization', () => {
    const rendered = renderFlagNarrative(sampleFlag)

    // Check currency and thousands separator
    expect(rendered.headline).toContain('₹1,923.21')
    expect(rendered.body).toContain('Spent ₹1,923.21')

    // Check singular pluralization (1 conversation -> reply)
    expect(rendered.body).toContain('1 messaging reply')

    // Check plural pluralization (2 conversations -> replies)
    const multiFlag: Flag = {
      ...sampleFlag,
      values: { ...sampleFlag.values, conversations: 2 },
    }
    const multiRendered = renderFlagNarrative(multiFlag)
    expect(multiRendered.body).toContain('2 messaging replies')
  })

  it('item 4.16 — uses authored phrasing when present, falls back to default template silently when absent', () => {
    const authoredPhrasing = narrativesFile.phrasings[sampleFlag.id]
    expect(authoredPhrasing).toBeDefined()

    // 1. With authored phrasing
    const authoredRender = renderFlagNarrative(sampleFlag, authoredPhrasing)
    expect(authoredRender.headline).toContain('₹1,923.21')
    expect(authoredRender.body).toContain('auction self-competition')

    // 2. Without authored phrasing (missing flag ID)
    const unauthoredFlag: Flag = {
      id: 'custom.unphrased.rule',
      channel: 'cross-channel',
      severity: 'watch',
      tier: 'process',
      subject: 'Custom Pipeline',
      values: {},
      ruleVersion: 1,
    }
    const fallbackRender = renderFlagNarrative(unauthoredFlag, null)
    expect(fallbackRender.headline).toContain('Custom Pipeline')
    expect(fallbackRender.body).toContain('Rule custom.unphrased.rule fired')
  })
})
