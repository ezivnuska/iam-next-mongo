// app/profile/page.tsx

"use client";

import Breadcrumbs from "../ui/breadcrumbs";
import ProtectedRoute from "@/app/ui/protected-route";
import type { Session } from "next-auth";

function ProfileContent({ session }: { session: Session }) {
  return (
    <main className="flex grow flex-col p-2">
      <Breadcrumbs
        breadcrumbs={[
          { label: "Profile", href: "/profile", active: true },
          { label: "Images", href: "/profile/images" },
        ]}
      />
      <div className="mt-4">
        <h1 className="text-2xl font-bold mb-2">
          Welcome, {session.user.username}
        </h1>
        <p>Email: {session.user.email}</p>
        <p>ID: {session.user.id}</p>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      {(session) => <ProfileContent session={session} />}
    </ProtectedRoute>
  );
}
