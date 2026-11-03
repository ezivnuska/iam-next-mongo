// app/lib/actions/public-content.ts

'use server';

import { connectToDatabase } from '@/app/lib/mongoose';
import { auth } from '@/app/lib/auth';
import EntryModel from '@/app/lib/models/entry';
import '@/app/lib/models/image';
import {
  transformEntry,
  getCommentCountsForContent,
  sortContentByDate,
} from '@/app/lib/utils/transformers/content';
import type { ContentItem } from '@/app/lib/definitions/content';
import { CONTENT_POPULATE_CONFIG } from '@/app/lib/utils/db-query-config';

export type PublicContentItem = ContentItem;

export async function getPublicContent(): Promise<PublicContentItem[]> {
  const session = await auth();

  await connectToDatabase();

  const entries = await EntryModel.find({
    $or: [{ contentType: 'post' }, { contentType: 'memory', shared: true }],
  })
    .populate(CONTENT_POPULATE_CONFIG)
    .sort({ createdAt: -1 })
    .lean();

  const commentCounts = await getCommentCountsForContent(entries);

  return sortContentByDate(
    entries.map((e: any) => transformEntry(e, commentCounts, session?.user?.id))
  );
}
