// app/lib/actions/public-content.ts

'use server';

import { connectToDatabase } from '@/app/lib/mongoose';
import { auth } from '@/app/lib/auth';
import Memory from '@/app/lib/models/memory';
import Post from '@/app/lib/models/post';
import Image from '@/app/lib/models/image'; // Also registers Image model for populate
import {
  transformMemory,
  transformPost,
  transformImage,
  getCommentCountsForContent,
  sortContentByDate
} from '@/app/lib/utils/transformers/content';
import type { ContentItem } from '@/app/lib/definitions/content';
import { CONTENT_POPULATE_CONFIG } from '@/app/lib/utils/db-query-config';

export type PublicContentItem = ContentItem;

export async function getPublicContent(): Promise<PublicContentItem[]> {
  const session = await auth();

  await connectToDatabase();

  // Fetch shared memories only
  const memories = await Memory.find({ shared: true })
    .populate(CONTENT_POPULATE_CONFIG)
    .sort({ createdAt: -1 })
    .lean();

  // Fetch all posts
  const posts = await Post.find({})
    .populate(CONTENT_POPULATE_CONFIG)
    .sort({ createdAt: -1 })
    .lean();

  // Fetch all images
  const images = await Image.find({})
    .sort({ createdAt: -1 })
    .lean();

  // Get comment counts for all content types (parallel execution)
  const { memoryCommentCounts, postCommentCounts } =
    await getCommentCountsForContent(memories, posts);

  // Transform all content
  const transformedMemories = memories.map((m: any) =>
    transformMemory(m, memoryCommentCounts, session?.user?.id)
  );

  const transformedPosts = posts.map((p: any) =>
    transformPost(p, postCommentCounts, session?.user?.id)
  );

//   const transformedImages = images.map((img: any) =>
//     transformImage(img, imageCommentCounts, session?.user?.id)
//   );

  // Combine and sort by createdAt
  const allContent = sortContentByDate([
    ...transformedMemories,
    ...transformedPosts,
    // ...transformedImages
  ]);

  return allContent;
}
