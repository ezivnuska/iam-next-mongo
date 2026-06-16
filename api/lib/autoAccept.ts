// api/lib/autoAccept.ts
// Single source of truth for the "is any pending bidder now fully funded?" check.
// Called by three endpoints: POST /applicants, PATCH /applicants, POST /pledges.

import { Types } from 'mongoose'
import Applicant from '../../app/lib/models/applicant'
import Pledge from '../../app/lib/models/pledge'
import { serializeApplicant } from '../../app/lib/mobile/serializers'
import { selectFundedWinner } from '../../app/lib/mobile/fundingUtils'
import { midnightFollowingDay } from '../../app/lib/mobile/deadlines'
import { holdPledges } from '../../app/lib/mobile/pledgePayments'
import { APPLICANT_USER_POPULATE } from '../../app/lib/utils/validation'

/**
 * After a bid or pledge change, check whether any pending applicant is now
 * fully funded and should be accepted.
 *
 * - When `candidateIds` is provided only those applicants are evaluated.
 *   Use this for bid-placement paths so a pre-existing higher-reputation
 *   bidder can't be accepted instead of the one who just acted.
 * - When omitted all pending bidders are evaluated.
 *   Use this for the pledge-add path so the best-funded bidder wins.
 *
 * On the pledge path (no filter) this function also handles directed-pledge
 * cleanup for the non-winning bidders: blanket-redirects rescindIfLost=false
 * pledges and removes rescindIfLost=true pledges.
 *
 * Returns the serialized accepted applicant, or null if no auto-accept fired.
 */
export async function tryAutoAccept(
  issueId: string,
  candidateIds?: Types.ObjectId[],
): Promise<any | null> {
  const alreadyAccepted = await Applicant.exists({ issueId, status: 'accepted' })
  if (alreadyAccepted) return null

  const query: Record<string, any> = {
    issueId,
    status: 'pending',
    bidAmount: { $exists: true, $ne: null },
  }
  if (candidateIds) query._id = { $in: candidateIds }

  const [candidates, allPledges] = await Promise.all([
    Applicant.find(query).sort({ createdAt: 1 }).lean() as Promise<any[]>,
    Pledge.find({ issueId }).lean() as Promise<any[]>,
  ])

  const winner = await selectFundedWinner(candidates, allPledges)
  if (!winner) return null

  await Applicant.findByIdAndUpdate(winner._id, {
    status: 'accepted',
    acceptedAt: new Date(),
    completionDeadline: midnightFollowingDay(),
  })

  // On the pledge path (no filter), redirect or remove directed pledges from
  // non-winning bidders so funds aren't locked against a losing applicant.
  if (!candidateIds) {
    const loserIds = candidates
      .filter((a: any) => a._id.toString() !== winner._id.toString())
      .map((a: any) => a._id)
    if (loserIds.length > 0) {
      await Promise.all([
        Pledge.updateMany(
          { issueId, applicantId: { $in: loserIds }, rescindIfLost: false },
          { $set: { applicantId: null } },
        ),
        Pledge.deleteMany({ issueId, applicantId: { $in: loserIds }, rescindIfLost: true }),
      ])
    }
  }

  // Hold all pledge funds now that a worker is committed. Best-effort — failures
  // are logged inside holdPledges but don't block the acceptance from completing.
  holdPledges(issueId).catch((err) => console.error('[autoAccept] holdPledges failed:', err))

  const accepted = await Applicant.findById(winner._id)
    .populate(APPLICANT_USER_POPULATE).lean()
  return serializeApplicant(accepted)
}
