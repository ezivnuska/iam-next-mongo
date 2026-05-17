// app/lib/mobile/attachIssueData.ts
// Attaches pledges and applicants to an array of raw Issue documents.
// completionStatus is read directly from the embedded issue.completion field.

import { USER_WITH_AVATAR_POPULATE, APPLICANT_USER_POPULATE } from '@/app/lib/utils/validation'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'

export async function attachIssueData(issues: any[]) {
  if (issues.length === 0) return []

  const ids = issues.map((n) => n._id)

  const [pledges, applicants] = await Promise.all([
    Pledge.find({ issueId: { $in: ids } }).populate(USER_WITH_AVATAR_POPULATE).lean(),
    Applicant.find({ issueId: { $in: ids } }).populate(APPLICANT_USER_POPULATE).lean(),
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

  return issues.map((n) => ({
    ...n,
    pledged: pledgesByIssue[n._id.toString()] ?? [],
    applicants: applicantsByIssue[n._id.toString()] ?? [],
    completionStatus: n.completion?.status ?? null,
  }))
}
