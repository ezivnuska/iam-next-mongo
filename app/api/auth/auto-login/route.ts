import { type NextRequest } from "next/server";
import { signIn } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return Response.redirect(new URL("/signin", request.url));
    await signIn("credentials", { autoLoginToken: token, redirectTo: "/" });
}
