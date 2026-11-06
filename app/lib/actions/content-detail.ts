// app/lib/actions/content-detail.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import EntryModel from "@/app/lib/models/entry";
import Image from "@/app/lib/models/image";
import { transformEntry } from "@/app/lib/utils/transformers/content";
import { getCommentCounts } from "@/app/lib/actions/comments";
import type { ContentItem } from "@/app/lib/definitions/content";
import { auth } from "@/app/lib/auth";
import { CONTENT_POPULATE_CONFIG } from "@/app/lib/utils/db-query-config";

export type { ContentItem };

export async function getContentDetailByUsername(
  username: string,
  id: string
): Promise<ContentItem | null> {
  if (!/^[a-f\d]{24}$/i.test(id)) return null;

  const session = await auth();
  const currentUserId = session?.user?.id;

  await connectToDatabase();

  const entry = await EntryModel.findById(id)
    .populate(CONTENT_POPULATE_CONFIG)
    .lean();

  if (!entry) return null;

  const author = (entry.author as any);
  if (author.username !== username) return null;

  if (entry.contentType === 'memory') {
    const isAuthor = currentUserId === author._id.toString();
    if (!entry.shared && !isAuthor) return null;
  }

  const refType = entry.contentType === 'memory' ? 'Memory' : 'Post';
  const commentCounts = await getCommentCounts([id], refType);
  return transformEntry(entry, commentCounts, currentUserId);
}
