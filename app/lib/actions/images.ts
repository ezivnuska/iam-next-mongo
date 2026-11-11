// app/lib/actions/images.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import UserModel from "@/app/lib/models/user";
import Comment from "@/app/lib/models/comment";
import EntryModel from "@/app/lib/models/entry";
import { Image } from "@/app/lib/definitions/image";
import { deleteS3File } from "@/app/lib/aws/s3";
import { auth } from "@/app/lib/auth";
import { getCommentCounts } from "@/app/lib/actions/comments";
import { Types } from "mongoose";
import { logActivity } from "@/app/lib/utils/activity-logger";
import { getS3ImageUrl, extractS3KeyFromUrl } from "@/app/lib/utils/images";
import { requireAuth } from "@/app/lib/utils/auth";
/**
 * Fetch images from the database
 * @param userId Optional filter to get images for a specific user
 * @param currentUserId Optional: mark images liked by this user
 */
export async function getImages(
  userId?: string,
  currentUserId?: string
): Promise<Image[]> {
    const session = await auth();
    if (!userId && !session?.user?.id) return [];
  try {
    await connectToDatabase();

    const query = userId ? { userId } : { userId: session?.user.id };
    const images = await ImageModel.find(query)
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const imageIds = images.map((img: any) => img._id.toString());

    // Batch fetch comment counts and entry references in parallel
    const imageObjectIds = images.map((img: any) => img._id);
    const [commentCounts, entriesWithImages] = await Promise.all([
      getCommentCounts(imageIds, 'Image'),
      EntryModel.find({ image: { $in: imageObjectIds } })
        .select('_id contentType title image')
        .lean(),
    ]);

    // Build imageId → usages map
    const usageMap: Record<string, Array<{ type: 'post' | 'memory'; id: string; title?: string }>> = {};
    for (const entry of entriesWithImages as any[]) {
      const imgId = entry.image.toString();
      if (!usageMap[imgId]) usageMap[imgId] = [];
      usageMap[imgId].push({
        type: entry.contentType as 'post' | 'memory',
        id: entry._id.toString(),
        ...(entry.title ? { title: entry.title } : {}),
      });
    }

    const activeUserId = currentUserId || session?.user?.id;
    return images.map((img: any) => {
      const imgId = img._id.toString();
      const likedByCurrentUser = activeUserId
        ? (img.likes ?? []).some((id: string) => id.toString() === activeUserId)
        : false;

      return {
        id: imgId,
        userId: img.userId.toString(),
        username: img.username,
        filename: img.filename,
        alt: img.alt ?? "",
        url: img.url ?? "",
        variants: (img.variants ?? []).map((v: any) => ({
          size: v.size,
          filename: v.filename,
          width: v.width,
          height: v.height,
          url: getS3ImageUrl(img.username, v.filename),
        })),
        likes: (img.likes ?? []).map((id: any) => id.toString()),
        likedByCurrentUser,
        commentCount: commentCounts[imgId] || 0,
        usages: usageMap[imgId] || [],
        createdAt: img.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt: img.updatedAt?.toISOString() ?? new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error("Error fetching images:", err);
    return [];
  }
}

export async function deleteImage(imageId: string) {
    const { id: userId } = await requireAuth();

    await connectToDatabase();

    const image = await ImageModel.findById(imageId);
    if (!image) throw new Error("Image not found");
    if (image.userId.toString() !== userId) throw new Error("Forbidden");

    // Save image data before deletion for activity log
    const imageData = {
      alt: image.alt,
      username: image.username,
      userId: image.userId.toString(),
      variantCount: image.variants.length
    };

    // Delete all comments related to this image
    const objectId = new Types.ObjectId(imageId);
    const result = await Comment.deleteMany({ refId: objectId, refType: 'Image' });
    console.log(`Deleted ${result.deletedCount} comments for image ${imageId}`);

    // Check if this image is the current user's avatar and set to null
    const user = await UserModel.findById(userId);
    if (user && user.avatar && user.avatar.toString() === imageId) {
      user.avatar = null;
      await user.save();
      console.log(`Removed avatar reference from user ${userId}`);
    }

    // Find entries that reference this image
    const postsWithImage = await EntryModel.find({ image: objectId });

    // Delete posts that have no content (only the image)
    const postsToDelete = postsWithImage.filter(p => !p.content || !p.content.trim());
    if (postsToDelete.length > 0) {
      const postIdsToDelete = postsToDelete.map(p => p._id);
      await EntryModel.deleteMany({ _id: { $in: postIdsToDelete } });
      console.log(`Deleted ${postsToDelete.length} posts with no content after image removal`);
    }

    // Remove image reference from posts that have content
    const postsToUpdate = postsWithImage.filter(p => p.content && p.content.trim());
    if (postsToUpdate.length > 0) {
      const postIdsToUpdate = postsToUpdate.map(p => p._id);
      await EntryModel.updateMany(
        { _id: { $in: postIdsToUpdate } },
        { $unset: { image: "" } }
      );
      console.log(`Removed image reference from ${postsToUpdate.length} posts`);
    }

    for (const v of image.variants) {
      const key = extractS3KeyFromUrl(v.url);
      if (key) await deleteS3File(key);
    }

    // Delete image document from MongoDB (this also removes likes since they're on the image document)
    await ImageModel.findByIdAndDelete(imageId);

    // Log activity
    await logActivity({
      userId,
      action: 'delete',
      entityType: 'image',
      entityId: imageId,
      entityData: imageData
    });

    return true;
  }
