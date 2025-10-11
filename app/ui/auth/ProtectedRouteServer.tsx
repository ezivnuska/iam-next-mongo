// app/components/ProtectedRouteServer.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import getServerSession from "next-auth";
import { authOptions } from "@/app/lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

export default async function ProtectedRouteServer({
  children,
  redirectTo = "/signin",
}: ProtectedRouteProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(redirectTo); // immediate server-side redirect
  }

  return <>{children}</>;
}
