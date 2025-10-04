// app/api/images/[id]/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function DELETE(req: Request, context: { params: { id: string } }) {
  const { params } = await context;
  const { id } = params;

  try {
    await connectToDatabase();
    const img = await ImageModel.findById(id);
    if (!img) return NextResponse.json({ error: "Image not found" }, { status: 404 });

    // Delete S3 variants
    for (const variant of img.variants) {
      if (!variant.filename || !img.username) continue;
      const key = `users/${img.username}/${variant.filename}`;
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: key,
          })
        );
      } catch (err) {
        console.error(`Failed to delete S3 object ${key}:`, err);
      }
    }

    // Delete MongoDB document
    await img.deleteOne();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
