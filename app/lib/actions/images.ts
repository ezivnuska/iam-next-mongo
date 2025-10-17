// app/lib/actions/images.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import UserModel from "@/app/lib/models/user";
import Comment from "@/app/lib/models/comment";
import Post from "@/app/lib/models/post";
import { Image } from "@/app/lib/definitions/image";
import { deleteS3File } from "@/app/lib/aws/s3";
import { auth } from "@/app/lib/auth";
import { getCommentCounts } from "@/app/lib/actions/comments";
import { Types } from "mongoose";
import { logActivity } from "@/app/lib/utils/activity-logger";
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
  try {
    await connectToDatabase();

    const query = userId ? { userId } : { userId: session?.user.id };
    const images = await ImageModel.find(query)
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    // Get comment counts for all images
    const imageIds = images.map((img: any) => img._id.toString());
    const commentCounts = await getCommentCounts(imageIds, 'Image');

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
        url: img.url ?? "", // original image URL
        variants: (img.variants ?? []).map((v: any) => ({
          size: v.size,
          filename: v.filename,
          width: v.width,
          height: v.height,
          url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/users/${img.username}/${v.filename}`,
        })),
        likes: (img.likes ?? []).map((id: any) => id.toString()),
        likedByCurrentUser,
        commentCount: commentCounts[imgId] || 0,
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
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await connectToDatabase();

    const image = await ImageModel.findById(imageId);
    if (!image) throw new Error("Image not found");

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
    const user = await UserModel.findById(session.user.id);
    if (user && user.avatar && user.avatar.toString() === imageId) {
      user.avatar = null;
      await user.save();
      console.log(`Removed avatar reference from user ${session.user.id}`);
    }

    // Find posts that reference this image
    const postsWithImage = await Post.find({ image: objectId });

    // Delete posts that have no content (only the image)
    const postsToDelete = postsWithImage.filter(p => !p.content || !p.content.trim());
    if (postsToDelete.length > 0) {
      const postIdsToDelete = postsToDelete.map(p => p._id);
      await Post.deleteMany({ _id: { $in: postIdsToDelete } });
      console.log(`Deleted ${postsToDelete.length} posts with no content after image removal`);
    }

    // Remove image reference from posts that have content
    const postsToUpdate = postsWithImage.filter(p => p.content && p.content.trim());
    if (postsToUpdate.length > 0) {
      const postIdsToUpdate = postsToUpdate.map(p => p._id);
      await Post.updateMany(
        { _id: { $in: postIdsToUpdate } },
        { $unset: { image: "" } }
      );
      console.log(`Removed image reference from ${postsToUpdate.length} posts`);
    }

    // Delete each variant from S3
    for (const v of image.variants) {
      if (v.url) {
        // Extract S3 key from URL
        const key = v.url.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
        if (key) await deleteS3File(key);
      }
    }

    // Delete image document from MongoDB (this also removes likes since they're on the image document)
    await ImageModel.findByIdAndDelete(imageId);

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'delete',
      entityType: 'image',
      entityId: imageId,
      entityData: imageData
    });

    return true;
  }
