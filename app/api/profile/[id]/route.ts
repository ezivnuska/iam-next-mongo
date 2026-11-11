// app/api/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import ImageModel from "@/app/lib/models/image";
import { requireAuth, UnauthorizedError } from "@/app/lib/utils/auth";
import { isValidObjectId } from "@iam/shared-types";
import { normalizeUser } from "@iam/db";

export async function POST(req: NextRequest) {
    try {
        const { id: userId } = await requireAuth();
        const url = new URL(req.url);
        const imageId = url.pathname.split("/").pop();

        if (!userId || !imageId) {
            return NextResponse.json({ error: "id and imageId required" }, { status: 400 });
        }

        if (!isValidObjectId(imageId)) {
            return NextResponse.json({ error: "Invalid imageId format" }, { status: 400 });
        }

        await connectToDatabase();

        const image = await ImageModel.findById(imageId);
        if (!image) {
            return NextResponse.json({ error: "Image not found" }, { status: 404 });
        }
        if (image.userId.toString() !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const user = await UserModel.findByIdAndUpdate(userId, { avatar: imageId }, { new: true })
            .populate("avatar", "_id variants");
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
        return NextResponse.json({ user: normalizeUser(user) });
    } catch (err) {
        console.error("Profile update error:", err);
        if (err instanceof UnauthorizedError) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}
