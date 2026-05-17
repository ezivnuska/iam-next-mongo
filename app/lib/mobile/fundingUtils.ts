// app/lib/mobile/fundingUtils.ts
// Shared utilities for pledge-based funding calculations.

import UserModel from '@/app/lib/models/user'

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
  const funded = candidates.filter(
    (a) => a.bidAmount != null && effectiveFunding(allPledges, a._id.toString()) >= a.bidAmount
  )
  if (funded.length === 0) return null

  const userIds = funded.map((a) => a.userId)
  const users   = await UserModel.find({ _id: { $in: userIds } }, { _id: 1, 'reputation.average': 1 }).lean() as any[]
  const repMap  = new Map(users.map((u) => [u._id.toString(), u.reputation?.average ?? -1]))

  funded.sort((a, b) => {
    const repDiff = (repMap.get(b.userId.toString()) ?? -1) - (repMap.get(a.userId.toString()) ?? -1)
    return repDiff !== 0 ? repDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return funded[0]
}
