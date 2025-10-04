// app/ui/protected-route.tsx

"use client";

import { useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useRouter } from "next/navigation";

interface ProtectedRouteProps {
  children: (session: Session) => ReactNode; // render-prop function
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(redirectTo);
    }
  }, [status, router, redirectTo]);

  // Show a loading state while session is loading
  if (status === "loading") {
    return <p className="flex grow flex-col p-2">Loading...</p>;
  }

  // Render children only if authenticated
  if (session?.user) {
    return <>{children(session)}</>;
  }

  // Null while redirecting
  return null;
}
