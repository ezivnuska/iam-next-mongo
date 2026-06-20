// app/lib/mobile/verifyToken.ts

import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

function getSecret(): Uint8Array {
  if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is not set')
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
}

export async function verifyToken(req: NextRequest): Promise<{ id: string; role?: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), getSecret());
    return payload as { id: string; role?: string };
  } catch {
    return null;
  }
}
