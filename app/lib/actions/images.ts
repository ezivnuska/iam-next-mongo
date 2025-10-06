// app/lib/actions/images.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import { Image } from "@/app/lib/definitions/image";
import { deleteS3File } from "@/app/lib/aws/s3";
import { auth } from "@/app/api/auth/[...nextauth]/route";
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
    console.log('query', query)
    const images = await ImageModel.find(query)
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    return images.map((img: any) => {
      const likedByCurrentUser = currentUserId
        ? (img.likes ?? []).some((id: string) => id.toString() === currentUserId)
        : false;

      return {
        id: img._id.toString(),
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
    await connectToDatabase();
  
    const image = await ImageModel.findById(imageId);
    if (!image) throw new Error("Image not found");
  
    // Delete each variant from S3
    for (const v of image.variants) {
      if (v.url) {
        // Extract S3 key from URL
        const key = v.url.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
        if (key) await deleteS3File(key);
      }
    }
  
    // Delete image document from MongoDB
    await ImageModel.findByIdAndDelete(imageId);
  
    return true;
  }
