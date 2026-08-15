import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Test helper: returns the declaration block for a selector in `src/index.css`.
 *
 * The design pass moved several rules that components used to set inline
 * (a table's `overflow-x`, a figure's `font-variant-numeric`) into the
 * stylesheet, which is the right place for them — but jsdom never applies
 * stylesheet rules, so `toHaveStyle` can no longer see them. Asserting the
 * class name alone would keep passing if the rule itself were deleted, which
 * is exactly the regression those tests exist to catch. Reading the rule back
 * out of the stylesheet keeps the guarantee end-to-end.
 *
 * Deliberately a plain substring scan rather than a CSS parser: it needs to
 * answer one question ("does this selector declare this property"), and a
 * parser dependency for that would be a heavier promise than the check needs.
 */
const INDEX_CSS_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.css')

export function indexCssRuleFor(selector: string): string {
  const css = readFileSync(INDEX_CSS_PATH, 'utf8')
  // Anchor at start-of-line so a compound selector that merely *contains* the
  // one asked for does not match first — `.panel > .data-table-container` would
  // otherwise shadow `.data-table-container` and return the wrong block.
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`^${escaped}\\s*\\{`, 'm').exec(css)
  if (match === null) {
    throw new Error(`index.css has no rule whose selector line is exactly "${selector}"`)
  }
  const open = css.indexOf('{', match.index)
  const close = css.indexOf('}', open)
  return css.slice(open + 1, close)
}
