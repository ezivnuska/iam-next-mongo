"use server";

import { connectToDatabase } from '@/app/lib/mongoose'
import User from '../models/user';
import { normalizeUsers } from "../utils/normalizeUser";

export async function getUsers() {
    try {
        await connectToDatabase()
        const users = await User.find({});
        return normalizeUsers(users)
    } catch (e) {
        console.error(e);
        return null;
    }
}