// app/lib/actions/profile.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "../models/user";
import { normalizeUser } from "../utils/normalizers";
import { requireAuth } from "@/app/lib/utils/auth";

export async function getProfile() {
    const { id: userId } = await requireAuth();
    await connectToDatabase()
    try {
        const user = await UserModel.findById(userId).populate('avatar', '_id, variants');
        return user;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function setAvatar(imageId: string | null) {
    const { id: userId } = await requireAuth();

    await connectToDatabase();

    try {
      // Validate imageId format if provided
      if (imageId !== null && !/^[a-f\d]{24}$/i.test(imageId)) {
        return { success: false, error: "Invalid imageId format" };
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

      // Sanitize: remove potentially dangerous characters
      const sanitizedBio = trimmedBio.replace(/[<>]/g, '');

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
