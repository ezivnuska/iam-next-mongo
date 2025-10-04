// app/hooks/useSessionClient.ts

"use client";

import { useSession } from "next-auth/react";

export function useCurrentSession() {
  const { data: session, status } = useSession();
  return { session, status };
}

// use inside a client component:

// "use client";

// import { useCurrentSession } from "@/app/hooks/useSessionClient";

// export default function UserProfile() {
//   const { session, status } = useCurrentSession();

//   if (status === "loading") return <p>Loading...</p>;
//   if (!session) return <p>You are not logged in</p>;

//   return (
//     <div>
//       <p>Welcome, {session.user.username}!</p>
//       <p>Email: {session.user.email}</p>
//     </div>
//   );
// }