// app/lib/actions/signout.ts

"use client";

import { signOut } from "next-auth/react";

export async function signOutUser(): Promise<void> {
  await signOut({ callbackUrl: "/" });
}
