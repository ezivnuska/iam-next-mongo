// app/lib/actions/users.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "../models/user";
import "@/app/lib/models/image"; // Required for populate("avatar")
import { normalizeUser, normalizeUsers, normalizePublicUser } from '@iam/db';
import { auth } from "@/app/lib/auth";

// ------------------------------
// Server-side: fetch all users
// ------------------------------
export async function getUsers() {
    const session = await auth()
    if (!session?.user?.id) return [];
    try {
        await connectToDatabase();
        const users = await UserModel.find({}).populate('avatar', '_id variants');
        const otherUsers = users.filter(user => user.id !== session.user.id)
        return normalizeUsers(otherUsers);
    } catch (e) {
        console.error("Error fetching users:", e);
        return null;
    }
}

export async function searchUserByEmail(email: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");
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