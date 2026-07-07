// app/lib/mobile/fundingUtils.ts
// Shared utilities for pledge-based funding calculations.

import Rating from '@/app/lib/models/rating'

/** Effective funding for an applicant = their directed pledges + all blanket pledges. */
export function effectiveFunding(allPledges: any[], applicantId: string): number {
  const blanket  = allPledges.filter((p) => !p.applicantId).reduce((s, p) => s + p.amount, 0)
  const directed = allPledges.filter((p) => p.applicantId?.toString() === applicantId).reduce((s, p) => s + p.amount, 0)
  return blanket + directed
}

/**
 * From a list of pending bidders, find the one whose bid is covered by the current
 * pledge pool and who ranks highest by reputation then earliest application date.
 * Returns null if no bidder is sufficiently funded.
 */
export async function selectFundedWinner(
  candidates: any[],
  allPledges: any[],
): Promise<any | null> {
  const totalPledged = allPledges.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0)
  const funded = candidates.filter(
    (a) => a.rate != null && totalPledged >= a.rate
  )
  if (funded.length === 0) return null

  const userIds = funded.map((a) => a.userId)
  const ratingDocs = await Rating.find({ workerId: { $in: userIds } }).lean() as any[]
  const repMap = new Map<string, number>()
  for (const uid of userIds) {
    const uidStr = uid.toString()
    const window = ratingDocs.filter((r) => r.workerId.toString() === uidStr).slice(-100)
    const rate = window.length === 0 ? -1 : window.filter((r) => r.vote === 'approve').length / window.length
    repMap.set(uidStr, rate)
  }

  funded.sort((a, b) => {
    const repDiff = (repMap.get(b.userId.toString()) ?? -1) - (repMap.get(a.userId.toString()) ?? -1)
    return repDiff !== 0 ? repDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return funded[0]
}
