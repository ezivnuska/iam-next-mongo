// app/api/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import ImageModel from "@/app/lib/models/image";
import { requireAuth } from "@/app/lib/utils/auth-utils";

export async function POST(req: NextRequest) {
    try {
        const { id: userId } = await requireAuth();
        console.log('userId', userId)
        const url = new URL(req.url);
        // console.log('url', url)
        const imageId = url.pathname.split("/").pop();
        console.log('imageId', imageId)

        // const email = formData.get("email")?.toString().trim();
        // const password = formData.get("password")?.toString();

        if (!userId || !imageId) {
            return NextResponse.json({ error: "id and imageId required" }, { status: 400 });
        }

        await connectToDatabase();

        const user = await UserModel.findByIdAndUpdate(userId, { avatar: imageId }, { new: true })
        console.log('updated user', user)
        return NextResponse.json({ user });
    } catch (err) {
        console.error("Profile update error:", err);
        if (err instanceof Error && err.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
