// app/api/users/me/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import { normalizeUser } from "@/app/lib/utils/normalizeUser";
import { requireAuth } from "@/app/lib/utils/auth-utils";

export async function GET(request: Request) {
    try {
        console.log('[/api/users/me] Request headers:', {
            cookie: request.headers.get('cookie'),
            host: request.headers.get('host'),
            'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
            'x-forwarded-host': request.headers.get('x-forwarded-host'),
        });
        const { id: userId } = await requireAuth();

        await connectToDatabase();

        const userDoc = await UserModel.findById(userId).populate(
            "avatar",
            "_id variants"
        );

        if (!userDoc) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(normalizeUser(userDoc));
    } catch (err) {
        console.error("Failed to fetch full user:", err);
        if (err instanceof Error && err.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
