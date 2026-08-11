/**
 * P1 made structural (TAD §9.2). A ratio that can only exist as summed parts —
 * there is no `+` on `Ratio`, and `resolve` is the only exit, so you cannot
 * average an average by accident. This closes the exact failure mode BRD §4.2's
 * note and TRD §4.5/§6.1 both call out, once, here, rather than at every call site.
 *
 * Every rate in the product is a `Ratio` until the moment it is formatted: CTR
 * `ratio(clicks, impressions)`, cost/conversation `ratio(spend, conversations)`,
 * engagement rate `ratio(engagedSessions, sessions)`, contact rate
 * `ratio(contacted, total)`, avg. position `ratio(sumPosition, impressions)`.
 */
export interface Ratio {
  readonly n: number
  readonly d: number
}

export const ratio = (n: number, d: number): Ratio => ({ n, d })

export const sumRatios = (rs: readonly Ratio[]): Ratio =>
  rs.reduce((a, b) => ({ n: a.n + b.n, d: a.d + b.d }), { n: 0, d: 0 })

/** `null` when undefined — never 0, never NaN, never Infinity. Callers must handle it (P4). */
export const resolve = (r: Ratio): number | null => (r.d === 0 ? null : r.n / r.d)
