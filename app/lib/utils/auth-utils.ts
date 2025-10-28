// app/lib/utils/auth-utils.ts

import { auth } from "@/app/lib/auth";

/**
 * Requires authentication and returns the authenticated user
 * @throws Error if user is not authenticated
 * @returns The authenticated user's session data
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

/**
 * Requires authentication with username and returns the authenticated user
 * @throws Error if user is not authenticated or username is missing
 * @returns The authenticated user's session data with username
 */
export async function requireAuthWithUsername() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.username) {
    throw new Error("Unauthorized");
  }
  return session.user as typeof session.user & { username: string };
}
