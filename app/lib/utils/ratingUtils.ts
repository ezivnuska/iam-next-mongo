// app/lib/utils/ratingUtils.ts

const REPUTATION_WINDOW = 100

/** Approval rate from the last REPUTATION_WINDOW ratings for a worker. */
export function calculateApprovalRate(ratings: { vote: 'approve' | 'deny' }[]): { approved: number; total: number } {
  const window = ratings.slice(-REPUTATION_WINDOW)
  const approved = window.filter((r) => r.vote === 'approve').length
  return { approved, total: window.length }
}
