// app/lib/actions/users.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "../models/user";
import "@/app/lib/models/image"; // Required for populate("avatar")
import { normalizeUser, normalizeUsers, normalizePublicUser } from '@iam/db';
import { requireAuth } from "@/app/lib/utils/auth";

// ------------------------------
// Server-side: fetch all users
// ------------------------------
export async function getUsers() {
    const { id: currentUserId } = await requireAuth();
    try {
        await connectToDatabase();
        const users = await UserModel.find({ _id: { $ne: currentUserId } })
            .populate('avatar', '_id variants')
            .limit(100)
            .sort({ createdAt: -1 });
        return normalizeUsers(users);
    } catch (e) {
        console.error("Error fetching users:", e);
        return null;
    }
}

export async function searchUserByEmail(email: string) {
    await requireAuth();
    await connectToDatabase();
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() }).populate('avatar', '_id variants');
    if (!user) return null;
    return normalizePublicUser(user);
}

export async function fetchUserByUsername(username: string) {
    await connectToDatabase();
    const user = await UserModel.findOne({ username }).populate('avatar', '_id variants');
    if (!user) return null
    const normalizedUser = normalizeUser(user)
    return normalizedUser ?? null;
}