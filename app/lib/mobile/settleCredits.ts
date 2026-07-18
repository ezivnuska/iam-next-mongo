// app/lib/mobile/settleCredits.ts
// Transfers pooled credits to the accepted worker when work is approved.

import { connectToDatabase } from '@/app/lib/mongoose'
import AllocationModel from '@/app/lib/models/allocation'
import MembershipModel from '@/app/lib/models/membership'
import UserModel from '@/app/lib/models/user'
import Applicant from '@/app/lib/models/applicant'
import Issue from '@/app/lib/models/issue'

export async function settleCredits(issueId: string): Promise<number> {
  await connectToDatabase()

  const acceptedApplicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as any
  if (!acceptedApplicant) throw new Error('No accepted applicant')

  // Sum direct allocations for this issue
  const allocations = await AllocationModel.find({ issueId }).lean() as any[]
  const totalAllocated = allocations.reduce((sum, a) => sum + (a.amount ?? 0), 0)

  // General pool share: (total member credits − total allocated globally) / open issue count
  const [memberTotals, globalAllocTotals, openCount] = await Promise.all([
    MembershipModel.aggregate([{ $group: { _id: null, total: { $sum: '$creditsTotal' } } }]),
    AllocationModel.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    Issue.countDocuments({ status: 'open' }),
  ])
  const totalMemberCredits   = memberTotals[0]?.total ?? 0
  const totalAllocatedGlobal = globalAllocTotals[0]?.total ?? 0
  const unallocated          = Math.max(0, totalMemberCredits - totalAllocatedGlobal)
  const generalPoolShare     = openCount > 0 ? Math.floor(unallocated / openCount) : 0

  const totalPayout = totalAllocated + generalPoolShare

  // Credit worker
  if (totalPayout > 0) {
    await UserModel.findByIdAndUpdate(acceptedApplicant.userId, {
      $inc: { creditBalance: totalPayout },
    })
  }

  // Clear this issue's allocations and reduce each member's creditsAllocated counter
  if (allocations.length > 0) {
    await Promise.all([
      AllocationModel.deleteMany({ issueId }),
      ...allocations.map((a) =>
        MembershipModel.findOneAndUpdate(
          { userId: a.userId },
          [{ $set: { creditsAllocated: { $max: [0, { $subtract: ['$creditsAllocated', a.amount] }] } } }]
        ).catch(() => {})
      ),
    ])
  }

  return totalPayout
}
