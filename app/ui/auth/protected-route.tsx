// app/ui/protected-route.tsx

"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/app/lib/providers/user-provider";
import { useAuthModal } from "@/app/lib/providers/auth-modal-provider";

interface ProtectedRouteProps {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { status, user } = useUser();
    const { openAuthModal } = useAuthModal();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    // only render on client
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && status === "unauthenticated" && user?.isGuest) {
            // Store the current path as callback URL before opening modal
            if (typeof window !== 'undefined' && pathname !== '/') {
                sessionStorage.setItem('authCallbackUrl', pathname);
            }
            openAuthModal('signin');
        }
    }, [mounted, status, user, openAuthModal, pathname]);

    if (!mounted || status === "loading") {
        return <p>Loading...</p>;
    }

    // During sign-out, keep showing the content until redirect
    if (status === "signing-out") {
        return <>{children}</>;
    }

    if (!user || user.isGuest) {
        return null
    }

    return <>{children}</>;
}
