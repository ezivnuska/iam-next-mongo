// app/lib/actions/upload.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Image, ImageVariant } from "@/app/lib/definitions/image";
import sharp from "sharp";
import type { Session } from "next-auth";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const VARIANT_SIZES = {
  original: null,
  medium: 800,
  small: 300,
};

export async function uploadFile(file: File, session: Session | null): Promise<Image> {
    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }
  
    const userId = session.user.id;
    const username = session.user.username;
  
    await connectToDatabase();
  
    const extension = file.name.split(".").pop();
    const baseFilename = uuidv4();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
  
    const variants: ImageVariant[] = [];
  
    for (const [size, width] of Object.entries(VARIANT_SIZES)) {
      let outputBuffer: Buffer;
      let resized = { width: 0, height: 0 };
  
      if (width) {
        const sharpImg = sharp(buffer).resize({ width, withoutEnlargement: true });
        outputBuffer = await sharpImg.toBuffer();
        const metadata = await sharpImg.metadata();
        resized = {
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
        };
      } else {
        const metadata = await sharp(buffer).metadata();
        resized = {
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
        };
        outputBuffer = buffer;
      }
  
      const filename = `${baseFilename}_${size}.${extension}`;
      const key = `users/${username}/${filename}`;
  
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: key,
          Body: outputBuffer,
          ContentType: file.type,
        })
      );
  
      const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  
      variants.push({ size, filename, width: resized.width, height: resized.height, url });
    }
  
    if (variants.length === 0) throw new Error("No image variants generated");
  
    const newImage = await ImageModel.create({
      userId,
      username,
      alt: file.name,
      variants,
      likes: [],
    });
  
    return {
      id: newImage._id.toString(),
      userId: newImage.userId.toString(),
      username: newImage.username,
      alt: newImage.alt,
      variants,
      likes: [],
      likedByCurrentUser: false,
      createdAt: newImage.createdAt.toISOString(),
      updatedAt: newImage.updatedAt.toISOString(),
    };
}
  