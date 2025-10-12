// app/api/users/me/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import { normalizeUser } from "@/app/lib/utils/normalizeUser";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();

        const userDoc = await UserModel.findById(session.user.id).populate(
            "avatar",
            "_id variants"
        );

        if (!userDoc) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(normalizeUser(userDoc));
    } catch (err) {
        console.error("Failed to fetch full user:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
