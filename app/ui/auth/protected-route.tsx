// app/ui/protected-route.tsx

"use client";

import { ReactNode, useEffect, useState } from "react";
import { useUser } from "@/app/lib/providers/user-provider";
import { useAuthModal } from "@/app/lib/providers/auth-modal-provider";

interface ProtectedRouteProps {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { status, user } = useUser();
    const { openAuthModal } = useAuthModal();
    const [mounted, setMounted] = useState(false);

    // only render on client
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && status === "unauthenticated" && user?.isGuest) {
            openAuthModal('signin');
        }
    }, [mounted, status, user, openAuthModal]);

    if (!mounted || status === "loading") {
        return <p>Loading...</p>;
    }

    // During sign-out, keep showing the content until redirect
    if (status === "signing-out") {
        return <>{children}</>;
    }

    if (!user || user.isGuest) {
        return <p>Please sign in to continue...</p>;
    }

    return <>{children}</>;
}
