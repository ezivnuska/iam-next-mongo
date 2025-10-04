// app/ui/protected-route.tsx

"use client";

import { useSession, signIn } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  // only render on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    // Optionally redirect to sign-in
    //
    // TODO: open sign-in modal
    //
    signIn();
    return <p>Redirecting...</p>;
  }

  return <>{children}</>;
}
