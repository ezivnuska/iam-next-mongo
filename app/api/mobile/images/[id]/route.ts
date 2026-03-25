// app/api/mobile/images/[id]/route.ts
// DELETE — delete an image and all associated data

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import UserModel from "@/app/lib/models/user";
import Comment from "@/app/lib/models/comment";
import Post from "@/app/lib/models/post";
import { deleteS3File } from "@/app/lib/aws/s3";
import { Types } from "mongoose";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "change-this-secret"
);

async function verifyToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), secret);
    return payload as { id: string };
  } catch {
    return null;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await verifyToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: imageId } = await params;

  if (!imageId || !/^[a-f\d]{24}$/i.test(imageId)) {
    return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const image = await ImageModel.findById(imageId);
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.userId.toString() !== payload.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const objectId = new Types.ObjectId(imageId);

    // Delete comments
    await Comment.deleteMany({ refId: objectId, refType: "Image" });

    // Clear avatar reference if needed
    const user = await UserModel.findById(payload.id);
    if (user?.avatar?.toString() === imageId) {
      user.avatar = null;
      await user.save();
    }

    // Remove from or delete posts
    const postsWithImage = await Post.find({ image: objectId });
    const postsToDelete = postsWithImage.filter((p) => !p.content?.trim());
    if (postsToDelete.length > 0) {
      await Post.deleteMany({ _id: { $in: postsToDelete.map((p) => p._id) } });
    }
    const postsToUpdate = postsWithImage.filter((p) => p.content?.trim());
    if (postsToUpdate.length > 0) {
      await Post.updateMany(
        { _id: { $in: postsToUpdate.map((p) => p._id) } },
        { $unset: { image: "" } }
      );
    }

    // Delete S3 variants
    for (const v of image.variants) {
      if (v.url) {
        const key = v.url.split(
          `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`
        )[1];
        if (key) await deleteS3File(key);
      }
    }

    await ImageModel.findByIdAndDelete(imageId);

    // Return whether the deleted image was the user's avatar (so client can update state)
    const wasAvatar = user?.avatar === null && image.userId.toString() === payload.id;

    return NextResponse.json({ ok: true, avatarCleared: wasAvatar });
  } catch (err) {
    console.error("[mobile/images DELETE]", err);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
