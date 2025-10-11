// app/users/page.tsx

import { lusitana } from '@/app/ui/fonts';
import ProtectedRoute from '@/app/ui/protected-route';
import { getUsers } from '@/app/lib/actions';
import Main from '../ui/main';
import UserList from '../ui/user-list';

export default async function Page() {
  const users = await getUsers();

  return (
    <ProtectedRoute>
      <Main>
        <p className={`${lusitana.className} text-xl text-gray-800 mb-3 md:text-3xl md:leading-normal`}>
          <strong>Users</strong>
        </p>
        <UserList users={users || []} />
      </Main>
    </ProtectedRoute>
  );
}
