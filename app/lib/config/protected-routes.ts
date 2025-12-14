// app/lib/config/protected-routes.ts

export interface RouteProtection {
  path: string;
  requireAuth: boolean;
  allowGuest?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
}

// Define which routes require protection
export const protectedRoutes: RouteProtection[] = [
  {
    path: '/users',
    requireAuth: true,
    allowGuest: false,
  },
  {
    path: '/profile',
    requireAuth: true,
    allowGuest: false,
  },
  {
    path: '/activity',
    requireAuth: true,
    allowGuest: false,
  },
  // Games can allow guests
  {
    path: '/games/poker',
    requireAuth: false,
    allowGuest: true,
  },
  {
    path: '/games/tiles',
    requireAuth: false,
    allowGuest: true,
  },
  // Admin routes (example)
  // {
  //   path: '/admin',
  //   requireAuth: true,
  //   allowGuest: false,
  //   allowedRoles: ['admin'],
  //   redirectTo: '/',
  // },
];

/**
 * Check if a path requires authentication
 */
export function isProtectedRoute(pathname: string): RouteProtection | undefined {
  return protectedRoutes.find(route => pathname.startsWith(route.path));
}

/**
 * Get protection config for a specific path
 */
export function getRouteProtection(pathname: string): RouteProtection | null {
  const protection = protectedRoutes.find(route => pathname.startsWith(route.path));
  return protection || null;
}
