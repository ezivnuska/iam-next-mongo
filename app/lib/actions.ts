"use server";

import client from "@/app/lib/mongodb";

export async function getUsers() {
    try {
        const mongoClient = await client.connect();
        const db = mongoClient.db("iameric")
        const users = await db.collection('users').find({}).toArray();
        return users
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function getPosts() {
    try {
        const mongoClient = await client.connect();
        const db = mongoClient.db("iameric")
        const posts = await db.collection('posts').find({}).toArray();
        return posts
    } catch (e) {
        console.error(e);
        return null;
    }
}
