// app/ui/protected-route.tsx

"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/app/lib/providers/user-provider";
import { useAuthModal } from "@/app/lib/providers/auth-modal-provider";

interface ProtectedRouteProps {
    children: ReactNode;
    requireAuth?: boolean; // Whether authentication is required (default: true)
    allowGuest?: boolean; // Whether guests are allowed (default: false)
    redirectTo?: string; // Where to redirect unauthenticated users
    useModal?: boolean; // Whether to use auth modal or redirect (default: true)
    allowedRoles?: string[]; // Specific roles allowed
    fallback?: ReactNode; // What to show while loading/unauthorized
}

export default function ProtectedRoute({
    children,
    requireAuth = true,
    allowGuest = false,
    redirectTo,
    useModal = true,
    allowedRoles,
    fallback
}: ProtectedRouteProps) {
    const { status, user } = useUser();
    const { openAuthModal } = useAuthModal();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // only render on client
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !requireAuth) return;

        const isGuest = user?.isGuest;
        const isUnauthenticated = status === "unauthenticated";

        // Check if user fails authentication requirements
        if ((isUnauthenticated || (isGuest && !allowGuest)) && status !== "loading") {
            if (useModal) {
                // Store the current path as callback URL before opening modal
                if (typeof window !== 'undefined' && pathname !== '/') {
                    sessionStorage.setItem('authCallbackUrl', pathname);
                }
                openAuthModal('signin');
            } else if (redirectTo) {
                // Redirect to specified path
                router.push(`${redirectTo}?redirected_from=${pathname}`);
            }
        }

        // Check role-based access
        if (allowedRoles && user && !isGuest) {
            const userRole = (user as any).role || 'user'; // Adjust based on your user object
            if (!allowedRoles.includes(userRole)) {
                if (redirectTo) {
                    router.push(redirectTo);
                }
            }
        }
    }, [mounted, status, user, requireAuth, allowGuest, openAuthModal, pathname, useModal, redirectTo, router, allowedRoles]);

    if (!mounted || status === "loading") {
        return fallback || <p>Loading...</p>;
    }

    // If auth not required, show content
    if (!requireAuth) {
        return <>{children}</>;
    }

    // During sign-out, keep showing the content until redirect
    if (status === "signing-out") {
        return <>{children}</>;
    }

    // Check authentication
    const isGuest = user?.isGuest;
    if (!user || (isGuest && !allowGuest)) {
        return fallback || null;
    }

    // Check role-based access
    if (allowedRoles && user) {
        const userRole = (user as any).role || 'user';
        if (!allowedRoles.includes(userRole)) {
            return fallback || (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                        <p className="text-gray-600">You don't have permission to access this page.</p>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}
