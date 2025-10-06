// app/api/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import ImageModel from "@/app/lib/models/image";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  
    // console.log('REQ', req)
    // console.log('BODY', req.body)

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
    
        const userId = session.user.id;
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
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
