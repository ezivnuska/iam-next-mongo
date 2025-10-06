// app/lib/actions/signout.ts

"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";

export async function signOutUser(signOutCallback?: () => void): Promise<void> {
  // Optional: trigger any provider state update before redirect
  if (signOutCallback) signOutCallback();

  await nextAuthSignOut({ redirect: true, callbackUrl: "/" });
}
