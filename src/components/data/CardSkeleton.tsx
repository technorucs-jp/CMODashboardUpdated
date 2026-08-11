/**
 * Item 2.8 — shown per card during fetch/aggregation, never a full-page
 * spinner. Sidebar and pickers live outside whatever renders this (they're
 * part of the shared `DashboardLayout`, item 0.14), so they stay interactive
 * while any number of cards are still loading.
 */
export interface CardSkeletonProps {
  /** Approximate height in pixels — lets a skeleton roughly match the card it stands in for, avoiding layout jump. */
  readonly height?: number
}

export function CardSkeleton({ height = 96 }: CardSkeletonProps) {
  return <div className="skeleton" role="status" aria-label="Loading" style={{ height }} />
}
