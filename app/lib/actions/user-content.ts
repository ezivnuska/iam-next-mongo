// app/lib/actions/user-content.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import EntryModel from "@/app/lib/models/entry";
import Image from "@/app/lib/models/image";
import User from "@/app/lib/models/user";
import {
  transformEntry,
  transformImage,
  getCommentCountsForContent,
  sortContentByDate,
} from "@/app/lib/utils/transformers/content";
import type { ContentItem } from "@/app/lib/definitions/content";
import { requireAuth } from "@/app/lib/utils/auth";
import { CONTENT_POPULATE_CONFIG } from "@/app/lib/utils/db-query-config";

export type { ContentItem };

export async function getUserContent(username?: string): Promise<ContentItem[]> {
  const { id: userId } = await requireAuth();

  await connectToDatabase();

  let targetUserId: string;
  if (username) {
    const user = await User.findOne({ username });
    if (!user) throw new Error("User not found");
    targetUserId = user._id.toString();
  } else {
    targetUserId = userId;
  }

  const isOwnProfile = targetUserId === userId;

  const entriesQuery = isOwnProfile
    ? { author: targetUserId }
    : { author: targetUserId, $or: [{ contentType: 'post' }, { contentType: 'memory', shared: true }] };

  const entries = await EntryModel.find(entriesQuery)
    .populate(CONTENT_POPULATE_CONFIG)
    .sort({ createdAt: -1 })
    .lean();

  const images = await Image.find({ userId: targetUserId })
    .sort({ createdAt: -1 })
    .lean();

  const commentCounts = await getCommentCountsForContent(entries);

  const transformedEntries = entries.map((e: any) =>
    transformEntry(e, commentCounts, userId)
  );

  return sortContentByDate(transformedEntries);
}
