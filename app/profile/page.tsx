// app/profile/page.tsx

"use client";

import Breadcrumbs from "../ui/breadcrumbs";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Page() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>Loading...</p>;
  if (!session?.user) return <button onClick={() => signIn("credentials")}>Sign In</button>;

  return (
    <main className="flex grow flex-col p-2">
        <Breadcrumbs
            breadcrumbs={[
                {
                    label: 'Profile',
                    href: '/profile',
                    active: true,
                },
                {
                    label: 'Images',
                    href: `/profile/images`,
                },
            ]}
        />
        <div>
            <h1>Welcome, {session.user.username}</h1>
            <p>Email: {session.user.email}</p>
            <p>ID: {session.user.id}</p>
            <button onClick={() => signOut()}>Sign Out</button>
        </div>
    </main>
  );
}
