import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js Middleware for Route Protection
 *
 * IMPORTANT: Cannot use auth() directly as it imports Mongoose (incompatible with Edge Runtime)
 * Using getToken() instead which reads JWT directly from cookies
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProduction = process.env.NODE_ENV === 'production';

  // Get JWT token from cookies (Edge-compatible)
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie: isProduction,
    cookieName: isProduction
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
  });

  const isAuthenticated = !!token;

  // Define protected routes
  const protectedRoutes = ['/profile', '/activity', '/social'];
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
 */
export const config = {
  matcher: [
    '/profile/:path*',
    '/activity/:path*',
    '/social/:path*',
  ],
};
