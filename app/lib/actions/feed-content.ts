'use server';

import { connectToDatabase } from '@/app/lib/mongoose';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import EntryModel from '@/app/lib/models/entry';
import Friendship from '@/app/lib/models/friendship';
import '@/app/lib/models/image';
import {
  transformEntry,
  getCommentCountsForContent,
  sortContentByDate,
} from '@/app/lib/utils/transformers/content';
import type { ContentItem } from '@/app/lib/definitions/content';
import { CONTENT_POPULATE_CONFIG } from '@/app/lib/utils/db-query-config';

export async function getFeedContent(): Promise<ContentItem[]> {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const userId = session.user.id;

  await connectToDatabase();

  // Resolve accepted friend IDs in both directions
  const friendships = await Friendship.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  }).select('requester recipient').lean();

  const friendIds = friendships.map((f: any) =>
    f.requester.toString() === userId
      ? f.recipient.toString()
      : f.requester.toString()
  );

  const entries = await EntryModel.find({
    $or: [
      // All posts from self or friends
      { contentType: 'post', author: { $in: [userId, ...friendIds] } },
      // Shared memories from friends
      { contentType: 'memory', shared: true, author: { $in: friendIds } },
      // Own memories (shared or private)
      { contentType: 'memory', author: userId },
    ],
  })
    .populate(CONTENT_POPULATE_CONFIG)
    .sort({ createdAt: -1 })
    .lean();

  const commentCounts = await getCommentCountsForContent(entries);

  return sortContentByDate(
    entries.map((e: any) => transformEntry(e, commentCounts, userId))
  );
}
