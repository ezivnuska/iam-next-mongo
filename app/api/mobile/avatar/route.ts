// app/api/mobile/avatar/route.ts
// Upload an image and set it as the user's avatar (POST)
// Set an existing image as avatar by id (PATCH)

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import ImageModel from "@/app/lib/models/image";
import "@/app/lib/models/image";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import { getS3UrlFromKey } from "@/app/lib/utils/images";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "change-this-secret"
);

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const VARIANT_DEFINITIONS = [
  { name: "original", width: null as number | null },
  { name: "medium", width: 800 },
  { name: "small", width: 300 },
];

async function verifyToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), secret);
    return payload as { id: string; username: string };
  } catch {
    return null;
  }
}

function serializeAvatar(doc: any) {
  return {
    id: doc._id.toString(),
    variants: doc.variants ?? [],
  };
}

// POST /api/mobile/avatar — upload image file and set as avatar
export async function POST(req: NextRequest) {
  const payload = await verifyToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    if (!extension || !allowedExtensions.includes(extension)) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      const meta = await sharp(buffer).metadata();
      if (!meta.format || !["jpeg", "png", "gif", "webp"].includes(meta.format)) {
        return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "File is not a valid image" }, { status: 400 });
    }

    await connectToDatabase();

    const userDoc = await UserModel.findById(payload.id);
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const username = userDoc.username as string;

    const baseFilename = uuidv4();
    const variants: any[] = [];

    for (const { name, width } of VARIANT_DEFINITIONS) {
      const sharpImg = width
        ? sharp(buffer).rotate().resize({ width, withoutEnlargement: true })
        : sharp(buffer).rotate();

      const outputBuffer = await sharpImg.toBuffer();
      const meta = await sharp(outputBuffer).metadata();

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

      variants.push({
        size: name,
        filename,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        url: getS3UrlFromKey(key),
      });
    }

    const newImage = await ImageModel.create({
      userId: payload.id,
      username,
      alt: file.name,
      variants,
      likes: [],
    });

    await UserModel.findByIdAndUpdate(payload.id, { avatar: newImage._id });

    return NextResponse.json({ avatar: serializeAvatar(newImage) });
  } catch (err) {
    console.error("[mobile/avatar POST]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// PATCH /api/mobile/avatar — set an existing image as avatar by id
export async function PATCH(req: NextRequest) {
  const payload = await verifyToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageId } = await req.json();

    if (imageId !== null && !/^[a-f\d]{24}$/i.test(imageId)) {
      return NextResponse.json({ error: "Invalid imageId" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await UserModel.findByIdAndUpdate(
      payload.id,
      { avatar: imageId },
      { new: true }
    ).populate("avatar", "_id variants");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const avatar = user.avatar ? serializeAvatar(user.avatar) : null;
    return NextResponse.json({ avatar });
  } catch (err) {
    console.error("[mobile/avatar PATCH]", err);
    return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
  }
}
