// scripts/migrate-entries.ts
// Run: MONGO_URI=... npx tsx scripts/migrate-entries.ts
// Dry run: MONGO_URI=... npx tsx scripts/migrate-entries.ts --dry-run
//
// Migrates documents from the `memories` and `posts` MongoDB collections
// into the unified `entries` collection. Preserves _id values so that
// existing comment and activity references remain valid.
//
// Safe to re-run: existing entries (matched by _id) are left unchanged.

import mongoose from 'mongoose'

const uri = process.env.MONGO_URI
if (!uri) { console.error('MONGO_URI not set'); process.exit(1) }

const dryRun = process.argv.includes('--dry-run')

async function migrateCollection(
  db: mongoose.mongo.Db,
  sourceCollection: string,
  contentType: 'memory' | 'post',
): Promise<{ inserted: number; skipped: number }> {
  const source = db.collection(sourceCollection)
  const target = db.collection('entries')

  const docs = await source.find({}).toArray()
  if (docs.length === 0) {
    console.log(`  ${sourceCollection}: no documents found`)
    return { inserted: 0, skipped: 0 }
  }

  console.log(`  ${sourceCollection}: found ${docs.length} document(s)`)

  if (dryRun) {
    console.log(`  [dry-run] would insert up to ${docs.length} into entries as contentType='${contentType}'`)
    return { inserted: docs.length, skipped: 0 }
  }

  let inserted = 0
  let skipped = 0

  for (const doc of docs) {
    const payload: Record<string, unknown> = {
      ...doc,
      contentType,
    }

    // Ensure memories always have a title
    if (contentType === 'memory' && !payload.title) {
      payload.title = 'Untitled'
    }

    const result = await target.updateOne(
      { _id: doc._id },
      { $setOnInsert: payload },
      { upsert: true },
    )

    if (result.upsertedCount > 0) {
      inserted++
    } else {
      skipped++
    }
  }

  return { inserted, skipped }
}

async function run() {
  if (dryRun) console.log('[dry-run mode — no writes will occur]\n')

  await mongoose.connect(uri!)
  const db = mongoose.connection.db!

  console.log('Migrating memories → entries...')
  const memories = await migrateCollection(db, 'memories', 'memory')
  console.log(`  inserted: ${memories.inserted}, skipped (already present): ${memories.skipped}`)

  console.log('\nMigrating posts → entries...')
  const posts = await migrateCollection(db, 'posts', 'post')
  console.log(`  inserted: ${posts.inserted}, skipped (already present): ${posts.skipped}`)

  const total = memories.inserted + posts.inserted
  console.log(`\nDone. Total inserted: ${total}`)

  if (!dryRun && total > 0) {
    console.log('\nNote: `memories` and `posts` collections have NOT been dropped.')
    console.log('Verify the app works correctly, then drop them manually:')
    console.log('  db.memories.drop()')
    console.log('  db.posts.drop()')
  }

  await mongoose.disconnect()
}

run().catch((err) => { console.error(err); process.exit(1) })
