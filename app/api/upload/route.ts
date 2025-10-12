// app/api/upload/route.ts

import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import type { ImageVariant } from "@/app/lib/definitions/image";
import { auth } from "@/app/lib/auth";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const sizes: { size: string; width: number; height: number }[] = [
  { size: "small", width: 64, height: 64 },
  { size: "medium", width: 256, height: 256 },
];

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, username } = session.user;

    if (!username) {
        return NextResponse.json({ error: "Username missing" }, { status: 400 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop();
    const baseFilename = `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}`;

    const originalFilename = `${baseFilename}-original.${ext}`;
    const originalKey = `users/${username}/${originalFilename}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: originalKey,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const originalUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/users/${username}/${originalFilename}`;
    const originalMeta = await sharp(buffer).metadata();

    const dbVariants: ImageVariant[] = [
      {
        size: "original",
        filename: originalFilename,
        width: originalMeta.width ?? 0,
        height: originalMeta.height ?? 0,
        url: originalUrl,
      },
    ];

    // Upload variants
    for (const v of sizes) {
      const resizedBuffer = await sharp(buffer)
        .resize(v.width, v.height, { fit: "cover" })
        .toBuffer();

      const filename = `${baseFilename}-${v.size}.${ext}`;
      const key = `users/${username}/${filename}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: key,
          Body: resizedBuffer,
          ContentType: file.type,
        })
      );

      const meta = await sharp(resizedBuffer).metadata();

      dbVariants.push({
        size: v.size,
        filename,
        width: meta.width ?? v.width,
        height: meta.height ?? v.height,
        url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/users/${username}/${filename}`,
      });
    }

    // Save to DB
    await connectToDatabase();
    await ImageModel.create({
      userId,
      username,
      alt: "",
      variants: dbVariants,
      likes: [],
    });

    return NextResponse.json({ ok: true, url: originalUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
