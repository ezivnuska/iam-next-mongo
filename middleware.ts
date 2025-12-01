import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js Middleware for Route Protection
 *
 * This middleware provides centralized authentication enforcement for protected routes.
 * It runs on the Edge Runtime before requests reach your pages.
 *
 * IMPORTANT: Edge Runtime Limitations
 * - Cannot import Mongoose (used by auth.ts)
 * - Uses next-auth/jwt's getToken() instead of auth() helper
 * - getToken() reads the session token directly from cookies (Edge-compatible)
 *
 * Protected Routes (require authentication):
 * - /profile/* - User profile pages
 * - /activity/* - Activity feed
 * - /users/* - All user-related pages:
 *   - /users - User listing
 *   - /users/[username] - Individual user profiles
 *   - /users/[username]/images - User image galleries
 *
 * Public Routes (accessible to guest users):
 * - / - Home page
 * - /poker - Poker game (supports guest users)
 * - /tiles - Tile gallery
 * - /work - Work page
 *
 * For unauthenticated users accessing protected routes:
 * - Redirects to home page with query params: ?auth=required&callbackUrl=/original-path
 * - AuthRedirectHandler component intercepts these params and shows auth modal
 * - After successful authentication, user is redirected to original destination
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get session token (Edge-compatible)
  // Note: Using NEXTAUTH_SECRET for backward compatibility with NextAuth v4 naming
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  });

  const isAuthenticated = !!token;

  // Define protected route patterns
  const protectedRoutes = [
    '/profile',
    '/activity',
    '/users',  // Protects /users and all sub-routes including /users/[username]
  ];

  // Check if current path matches any protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const url = new URL('/', req.url);
    url.searchParams.set('auth', 'required');
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Middleware Configuration
 *
 * Matcher patterns determine which routes this middleware runs on.
 * Uses Next.js path matching syntax:
 * - /path/* - matches /path and all subdirectories
 * - /path/:param* - matches dynamic segments
 *
 * Note: Middleware does NOT run on:
 * - API routes (/api/*)
 * - Static files (_next/static/*)
 * - Image optimization (_next/image/*)
 * - Favicon.ico
 */
export const config = {
  matcher: [
    '/profile/:path*',
    '/activity/:path*',
    '/users/:path*',
  ],
};
