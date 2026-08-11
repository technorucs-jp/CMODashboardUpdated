import type { Coverage } from '@/lib/coverage/coverage'
import { EmptyState } from './EmptyState'
import { NoDataBeforeDate } from './NoDataBeforeDate'
import { PartialDataWarning } from './PartialDataWarning'
import { LaggingDataNotice } from './LaggingDataNotice'
import { NotConnectedPanel } from './NotConnectedPanel'

/**
 * Item 3.1's single dispatcher — every tab renders its non-renderable
 * `Coverage` states through this one component instead of reimplementing the
 * copy/markup per tab (the item's own verify: no tab file should contain the
 * literal string "No data"). Returns `null` for 'full' and 'lagging' isn't
 * actually non-renderable (item 1.19) — a caller showing this alongside real
 * data (not instead of it) is expected for 'lagging'.
 */
export function CoverageState({ coverage }: { coverage: Coverage }) {
  switch (coverage.kind) {
    case 'full':
      return null
    case 'lagging':
      return <LaggingDataNotice dataAsOf={coverage.dataAsOf} />
    case 'partial':
    case 'requires-full-coverage':
      return <PartialDataWarning coverage={coverage} />
    case 'none':
      return coverage.earliest ? <NoDataBeforeDate earliest={coverage.earliest} /> : <EmptyState />
    case 'not-connected':
      return <NotConnectedPanel />
    default: {
      const _exhaustive: never = coverage
      throw new Error(`CoverageState: unrecognised coverage kind: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
