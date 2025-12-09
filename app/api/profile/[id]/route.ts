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
        const url = new URL(req.url);
        const imageId = url.pathname.split("/").pop();

        if (!userId || !imageId) {
            return NextResponse.json({ error: "id and imageId required" }, { status: 400 });
        }

        // Validate imageId is a valid MongoDB ObjectId (24 hex characters)
        if (!/^[a-f\d]{24}$/i.test(imageId)) {
            return NextResponse.json({ error: "Invalid imageId format" }, { status: 400 });
        }

        await connectToDatabase();

        const user = await UserModel.findByIdAndUpdate(userId, { avatar: imageId }, { new: true })
        return NextResponse.json({ user });
    } catch (err) {
        console.error("Profile update error:", err);
        if (err instanceof Error && err.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
