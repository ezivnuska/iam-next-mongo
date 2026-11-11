// app/lib/actions/profile.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "../models/user";
import ImageModel from "../models/image";
import { normalizeUser } from '@iam/db';
import { requireAuth } from "@/app/lib/utils/auth";
import { isValidObjectId } from "@iam/shared-types";

export async function getProfile() {
    const { id: userId } = await requireAuth();
    await connectToDatabase()
    try {
        const user = await UserModel.findById(userId).populate('avatar', '_id variants');
        if (!user) return null;
        return normalizeUser(user);
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function setAvatar(imageId: string | null) {
    const { id: userId } = await requireAuth();

    await connectToDatabase();

    try {
      if (imageId !== null && !isValidObjectId(imageId)) {
        return { success: false, error: "Invalid imageId format" };
      }

      if (imageId !== null) {
        const image = await ImageModel.findById(imageId).select('userId').lean<{ userId: { toString(): string } }>();
        if (!image) return { success: false, error: "Image not found" };
        if (image.userId.toString() !== userId) {
          return { success: false, error: "Forbidden" };
        }
      }

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { avatar: imageId },
        { new: true }
      )
      .populate("avatar", "_id variants");

      if (!user) return { success: false, error: "User not found" };

      return { success: true, user: normalizeUser(user) };
    } catch (e) {
      console.error(e);
      return { success: false, error: "Failed to update avatar" };
    }
}

export async function updateBio(bio: string) {
    const { id: userId } = await requireAuth();

    await connectToDatabase();

    try {
      // Server-side validation
      const trimmedBio = bio.trim();

      if (trimmedBio.length > 500) {
        return { success: false, error: "Bio must be 500 characters or less" };
      }

      // Strip HTML tags — bio is rendered via React JSX which auto-escapes text.
      const sanitizedBio = trimmedBio.replace(/<[^>]*>/g, '');

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { bio: sanitizedBio },
        { new: true }
      )
      .populate("avatar", "_id variants");

      if (!user) return { success: false, error: "User not found" };

      return { success: true, user: normalizeUser(user) };
    } catch (e) {
      console.error(e);
      return { success: false, error: "Failed to update bio" };
    }
}
