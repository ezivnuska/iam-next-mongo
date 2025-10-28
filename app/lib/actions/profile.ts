// app/lib/actions/profile.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "../models/user";
import { normalizeUser } from "../utils/normalizeUser";
import { requireAuth } from "@/app/lib/utils/auth-utils";

export async function getProfile() {
    const { id: userId } = await requireAuth();
    await connectToDatabase()
    try {
        const user = await UserModel.findById(userId).populate('avatar', '_id, variants');
        console.log('profile', user);
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
      const user = await UserModel.findByIdAndUpdate(
        userId,
        { bio },
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
