// app/lib/mobile/attachIssueData.ts
// Attaches pledges, applicants, and completionStatus to an array of raw Issue documents.

import { USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import Commission from '@/app/lib/models/commission'

export async function attachIssueData(issues: any[]) {
  if (issues.length === 0) return []

  const ids = issues.map((n) => n._id)

  const [pledges, applicants, completions] = await Promise.all([
    Pledge.find({ issueId: { $in: ids } }).populate(USER_WITH_AVATAR_POPULATE).lean(),
    Applicant.find({ issueId: { $in: ids } }).lean(),
    Commission.find({ issueId: { $in: ids } }, { issueId: 1, status: 1 }).lean(),
  ])

  const pledgesByIssue: Record<string, any[]> = {}
  for (const p of pledges) {
    const key = p.issueId.toString()
    ;(pledgesByIssue[key] ??= []).push(p)
  }

  const applicantsByIssue: Record<string, any[]> = {}
  for (const a of applicants) {
    const key = a.issueId.toString()
    ;(applicantsByIssue[key] ??= []).push(a)
  }

  const completionStatusByIssue: Record<string, string> = {}
  for (const c of completions as any[]) {
    completionStatusByIssue[c.issueId.toString()] = c.status
  }

  return issues.map((n) => ({
    ...n,
    pledged: pledgesByIssue[n._id.toString()] ?? [],
    applicants: applicantsByIssue[n._id.toString()] ?? [],
    completionStatus: completionStatusByIssue[n._id.toString()] ?? null,
  }))
}
