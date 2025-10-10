// app/lib/actions/users.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "../models/user";
import { normalizeUser, normalizeUsers } from "../utils/normalizeUser";
import { auth } from "@/app/api/auth/[...nextauth]/route";

// ------------------------------
// Server-side: fetch all users
// ------------------------------
export async function getUsers() {
    const session = await auth()
    try {
        await connectToDatabase();
        const users = await UserModel.find({})
        const otherUsers = users.filter(user => user.id !== session?.user.id)
        return normalizeUsers(otherUsers);
    } catch (e) {
        console.error("Error fetching users:", e);
        return null;
    }
}

export async function fetchUserByUsername(username: string) {
    await connectToDatabase();
    const user = await UserModel.findOne({ username }).lean();
    return user
    // if (!user) return null
    // const normalizedUser = normalizeUser(user)
    // return normalizedUser ?? null;
}