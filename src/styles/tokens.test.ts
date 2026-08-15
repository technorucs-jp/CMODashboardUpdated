import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * Guard for a failure mode that is completely silent in a browser: `var(--typo)`
 * against an undefined custom property resolves to nothing, so the declaration is
 * simply dropped. Text keeps its inherited colour and a panel renders with no
 * background — it looks like the styling "didn't get applied" rather than like an
 * error, and nothing in typecheck, lint or a render test catches it.
 *
 * This is not hypothetical: the design pass found `var(--surface-2)`,
 * `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)` and
 * `var(--surface-1)` used across seven files, none of which exist — the real
 * tokens are all `--color-*` prefixed.
 */

/**
 * Custom properties set inline on an element and consumed by a rule in
 * index.css, rather than declared globally in tokens.css. These are the
 * component-parameter kind ("which hue is *this* card"), not palette entries —
 * the value always resolves to a real token at the call site.
 */
const LOCALLY_DEFINED = new Set([
  '--page-accent', // set per page to tint its title
  '--kpi-accent', // set per KPI card
  '--flag-hue', // FlagCallout severity rule
  '--tier-bg', // FlagCallout tier chip fill
  '--tier-fg', // FlagCallout tier chip label
  '--sync-hue', // LastSyncedBadge freshness level
  '--rdp-accent-color', // react-day-picker's own theming hooks
  '--rdp-background-color',
])

function definedTokens(): Set<string> {
  const css = readFileSync(join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8')
  return new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]))
}

/**
 * Shipped source only. Test files are excluded because the invariant is about
 * what renders in the browser — and because this very file names the bad tokens
 * (`var(--surface-2)` and friends) in its own doc comment as the example of what
 * went wrong, which would otherwise make the guard flag itself.
 */
function sourceFiles(): string[] {
  return execSync('git ls-files src', { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && !/\.testutil\.ts$/.test(f))
}

describe('design tokens', () => {
  it('every var(--token) reference resolves to a token defined in tokens.css', () => {
    const tokens = definedTokens()
    const unresolved: string[] = []

    for (const file of sourceFiles()) {
      const contents = readFileSync(join(ROOT, file), 'utf8')
      for (const match of contents.matchAll(/var\((--[a-z0-9-]+)/g)) {
        const token = match[1]
        if (!tokens.has(token) && !LOCALLY_DEFINED.has(token)) {
          unresolved.push(`${file}: var(${token})`)
        }
      }
    }

    expect(unresolved).toEqual([])
  })

  it('no component hardcodes a hex colour — item 0.9s own verify, as a test', () => {
    // `grep -rn '#[0-9a-fA-F]{6}' src/components/` was item 0.9's manual check and
    // had drifted: LastSyncedBadge, FlagCallout and SectionErrorBoundary all carried
    // literal hexes (mostly as `var(--token, #fallback)` defaults, which quietly
    // defeat the point — a typo'd token name then renders the fallback instead of
    // failing visibly). Colour belongs in tokens.css; components reference it.
    const offenders: string[] = []
    for (const file of sourceFiles().filter((f) => f.startsWith('src/components/'))) {
      const contents = readFileSync(join(ROOT, file), 'utf8')
      for (const match of contents.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        offenders.push(`${file}: ${match[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('tokens.css actually defines the colour tokens the design system leans on', () => {
    const tokens = definedTokens()
    for (const required of [
      '--color-bg',
      '--color-surface-1',
      '--color-surface-2',
      '--color-border',
      '--color-text-primary',
      '--color-text-secondary',
      '--color-text-muted',
      '--sidebar-width',
      '--topbar-height',
    ]) {
      expect(tokens, `tokens.css must define ${required}`).toContain(required)
    }
  })
})
