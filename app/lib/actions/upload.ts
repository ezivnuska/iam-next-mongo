// app/lib/actions/upload.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { Image, ImageVariant } from "@/app/lib/definitions/image";
import sharp from "sharp";
import { auth } from "@/app/lib/auth";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const VARIANT_DEFINITIONS: { name: string; width: number | null }[] = [
    { name: "original", width: null },
    { name: "medium", width: 800 },
    { name: "small", width: 300 },
];

export async function uploadFile(file: File): Promise<Image> {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.username) {
      throw new Error("Unauthorized");
    }

    const { id, username } = session.user;
  
    await connectToDatabase();
  
    const extension = file.name.split(".").pop();
    const baseFilename = uuidv4();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
  
    const variants: ImageVariant[] = [];
  
    for (const { name, width } of VARIANT_DEFINITIONS) {
        let outputBuffer: Buffer;
        let resized = { width: 0, height: 0 };

        if (width) {
          const sharpImg = sharp(buffer).rotate().resize({ width, withoutEnlargement: true });
          outputBuffer = await sharpImg.toBuffer();
          const metadata = await sharpImg.metadata();
          resized = {
            width: metadata.width ?? 0,
            height: metadata.height ?? 0,
          };
        } else {
          const sharpImg = sharp(buffer).rotate();
          outputBuffer = await sharpImg.toBuffer();
          const metadata = await sharpImg.metadata();
          resized = {
            width: metadata.width ?? 0,
            height: metadata.height ?? 0,
          };
        }
      
        const filename = `${baseFilename}_${name}.${extension}`;
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
        variants.push({ size: name, filename, width: resized.width, height: resized.height, url });
    }
  
    if (variants.length === 0) throw new Error("No image variants generated");
  
    const newImage = await ImageModel.create({
      userId: id,
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
      commentCount: 0,
      createdAt: newImage.createdAt?.toISOString() || new Date().toISOString(),
    };
}
  