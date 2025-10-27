// app/lib/api/with-auth.ts

import { auth } from '@/app/lib/auth';
import type { Session } from 'next-auth';

/**
 * Route handler with authenticated session
 */
export type AuthenticatedHandler<T = any> = (
  request: Request,
  context: T,
  session: Session
) => Promise<Response>;

/**
 * Higher-order function that wraps a route handler with authentication
 *
 * @param handler - The route handler that requires authentication
 * @returns Wrapped handler that checks auth before executing
 *
 * @example
 * ```typescript
 * export const GET = withAuth(async (request, context, session) => {
 *   // session.user.id is guaranteed to exist here
 *   return Response.json({ userId: session.user.id });
 * });
 * ```
 */
export function withAuth<T = any>(
  handler: AuthenticatedHandler<T>
): (request: Request, context: T) => Promise<Response> {
  return async (request: Request, context: T): Promise<Response> => {
    try {
      const session = await auth();

      if (!session?.user?.id) {
        return Response.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      return await handler(request, context, session);
    } catch (error) {
      console.error('[withAuth] Error:', error);
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Simple auth middleware that only checks authentication without wrapping
 * Useful for route handlers that need more control
 *
 * @returns Session if authenticated, null otherwise
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return session;
}
