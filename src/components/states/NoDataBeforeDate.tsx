/** Item 3.1 — a range entirely before a channel's `earliestRecordDate` (BRD §4.1: an explicit
 *  state, never a zero). `earliest` is the 'YYYY-MM-DD' business date the channel's history starts. */
export interface NoDataBeforeDateProps {
  readonly earliest: string
}

export function NoDataBeforeDate({ earliest }: NoDataBeforeDateProps) {
  return (
    <div className="card" style={{ padding: 16 }} role="status">
      No data before {earliest}.
    </div>
  )
}
