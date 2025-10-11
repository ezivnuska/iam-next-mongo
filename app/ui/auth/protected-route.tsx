// app/ui/protected-route.tsx

"use client";

import { ReactNode, useEffect, useState } from "react";
import { useUser } from "@/app/lib/providers/user-provider";

interface ProtectedRouteProps {
    children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { status, user, signIn } = useUser();
    const [mounted, setMounted] = useState(false);

    // only render on client
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || status === "loading") {
        return <p>Loading...</p>;
    }

    if (!user) {
        // Optionally redirect to sign-in
        //
        // TODO: open sign-in modal
        //
        signIn();
        return <p>Redirecting...</p>;
    }

    return <>{children}</>;
}
