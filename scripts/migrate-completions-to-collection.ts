// scripts/migrate-completions-to-collection.ts
// Run: MONGO_URI=... npx tsx scripts/migrate-completions-to-collection.ts
//
// Migrates embedded issue.completion and issue.previousCompletions to the
// Completion collection. Uses Rating.workerId to recover workerUserId for
// existing records. Safe to re-run: skips issues already migrated.

import mongoose from 'mongoose'
import Completion from '../app/lib/models/completion'
import Rating from '../app/lib/models/rating'

const uri = process.env.MONGO_URI
if (!uri) { console.error('MONGO_URI not set'); process.exit(1) }

async function run() {
  await mongoose.connect(uri!)

  // Read embedded completions via raw collection access (fields no longer on schema)
  const issues = await mongoose.connection.db!
    .collection('issues')
    .find({
      $or: [
        { completion: { $ne: null, $exists: true } },
        { 'previousCompletions.0': { $exists: true } },
      ]
    })
    .toArray()

  console.log(`Found ${issues.length} issues to migrate.`)
  let created = 0; let skipped = 0

  for (const issue of issues) {
    const issueId = issue._id

    // Check if already migrated
    const existing = await Completion.countDocuments({ issueId })
    if (existing > 0) { skipped++; continue }

    // Migrate previousCompletions (historical, status=denied)
    for (const c of ((issue as any).previousCompletions ?? [])) {
      const rating = await Rating.findOne({ commissionId: c._id }).lean() as any
      const workerUserId = rating?.workerId ?? null
      if (!workerUserId) {
        console.warn(`No rating found for previousCompletion ${c._id} on issue ${issueId}, skipping`)
        continue
      }

      await Completion.create({
        _id: c._id,
        issueId,
        workerUserId,
        images: c.images ?? [],
        reviews: c.reviews ?? [],
        status: 'denied',
        autoApproveAt: c.autoApproveAt ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })
      created++
    }

    // Migrate active completion
    if ((issue as any).completion) {
      const c = (issue as any).completion
      const rating = await Rating.findOne({ commissionId: c._id }).lean() as any
      const workerUserId = rating?.workerId ?? null
      if (workerUserId) {
        await Completion.create({
          _id: c._id,
          issueId,
          workerUserId,
          images: c.images ?? [],
          reviews: c.reviews ?? [],
          status: c.status ?? 'pending',
          autoApproveAt: c.autoApproveAt ?? null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        })
        created++
      } else {
        console.warn(`No rating found for active completion ${c._id} on issue ${issueId}, skipping`)
      }
    }

    // Set denormalized completionStatus
    const activeStatus = (issue as any).completion?.status ?? null
    await mongoose.connection.db!.collection('issues').updateOne(
      { _id: issueId },
      { $set: { completionStatus: activeStatus } }
    )
  }

  console.log(`Done. Created: ${created}, Skipped (already migrated): ${skipped}`)
  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
