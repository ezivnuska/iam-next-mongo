// app/profile/page.tsx

"use client";

import Breadcrumbs from "../ui/breadcrumbs";
import ProtectedRoute from "../ui/protected-route";
import { useSession } from "next-auth/react";

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute>
      <main className="flex grow flex-col p-2">
        <Breadcrumbs
          breadcrumbs={[
            { label: "Profile", href: "/profile", active: true },
            { label: "Images", href: "/profile/images" },
          ]}
        />
        <div className="mt-4">
          <h1 className="text-2xl font-bold mb-2">
            Welcome, {session?.user.username}
          </h1>
          <p>Email: {session?.user.email}</p>
          <p>ID: {session?.user.id}</p>
        </div>
      </main>
    </ProtectedRoute>
  );
}
