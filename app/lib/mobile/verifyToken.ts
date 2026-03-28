// app/lib/mobile/verifyToken.ts

import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "change-this-secret"
);

export async function verifyToken(req: NextRequest): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), secret);
    return payload as { id: string };
  } catch {
    return null;
  }
}
