// app/users/page.tsx

"use server";

import { lusitana } from '@/app/ui/fonts';
import ProtectedRoute from '@/app/ui/protected-route';
import { getUsers } from '@/app/lib/actions';

export default async function Page() {
  const users = await getUsers(); // runs on server, safe to call mongoose here

  return (
    <ProtectedRoute>
      <main className="flex grow flex-col p-2">
        <p className={`${lusitana.className} text-xl text-gray-800 md:text-3xl md:leading-normal`}>
          <strong>Users</strong>
        </p>
        <div>
          {users?.length
            ? (
                users.map(user => <p key={user.username}>{user.username}</p>)
            ) 
            : <p>No users</p>
          }
        </div>
      </main>
    </ProtectedRoute>
  );
}
