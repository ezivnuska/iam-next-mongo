"use server";

import { connectToDatabase } from '@/app/lib/mongoose'
import Post from '../models/post';
import { normalizePosts } from "../utils/normalizePost";

export async function getPosts() {
    try {
        await connectToDatabase()
        const posts = await Post.find({});
        return normalizePosts(posts)
    } catch (e) {
        console.error(e);
        return null;
    }
}
