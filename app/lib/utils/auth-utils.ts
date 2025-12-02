// app/lib/utils/auth-utils.ts

import { auth } from "@/app/lib/auth";
import { UserRole } from "@/app/lib/definitions/user";

/**
 * Requires authentication and returns the authenticated user
 * @throws Error if user is not authenticated
 * @returns The authenticated user's session data
 */
export async function requireAuth() {
  // Check cookies in the request
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log('[requireAuth] Cookies:', allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));

  const session = await auth();
  console.log('[requireAuth] Session check:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id,
    email: session?.user?.email,
  });
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

/**
 * Requires authentication and verifies the user has the specified role
 * @param role - The required role (e.g., UserRole.Admin)
 * @throws Error with "Unauthorized" if user is not authenticated
 * @throws Error with "Forbidden" if user does not have the required role
 * @returns The authenticated user's session data
 *
 * @example
 * ```ts
 * // In a server action or API route
 * export async function deleteUser(userId: string) {
 *   const admin = await requireRole(UserRole.Admin);
 *   // Only admins reach this point
 *   await User.findByIdAndDelete(userId);
 * }
 * ```
 */
export async function requireRole(role: UserRole) {
  const user = await requireAuth();
  if (user.role !== role) {
    throw new Error("Forbidden");
  }
  return user;
}

/**
 * Requires authentication and verifies the user has at least one of the specified roles
 * @param roles - Array of acceptable roles
 * @throws Error with "Unauthorized" if user is not authenticated
 * @throws Error with "Forbidden" if user does not have any of the required roles
 * @returns The authenticated user's session data
 *
 * @example
 * ```ts
 * // In a server action or API route
 * export async function moderateContent(contentId: string) {
 *   const user = await requireAnyRole([UserRole.Admin, UserRole.Moderator]);
 *   // Only admins or moderators reach this point
 *   await Content.findByIdAndUpdate(contentId, { moderated: true });
 * }
 * ```
 */
export async function requireAnyRole(roles: UserRole[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
