// app/lib/actions/profile.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "../models/user";
import { auth } from "@/app/lib/auth";
import { normalizeUser } from "../utils/normalizeUser";

export async function getProfile() {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
    await connectToDatabase()
    try {
        const user = await UserModel.findById(session.user.id).populate('avatar', '_id, variants');
        console.log('profile', user);
        return user;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function setAvatar(imageId: string | null) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await connectToDatabase();

    try {
      const user = await UserModel.findByIdAndUpdate(
        session.user.id,
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
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await connectToDatabase();

    try {
      const user = await UserModel.findByIdAndUpdate(
        session.user.id,
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
