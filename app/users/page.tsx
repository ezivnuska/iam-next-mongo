// app/users/page.tsx

import { ubuntu } from '@/app/ui/fonts';
import ProtectedRoute from '@/app/ui/auth/protected-route';
import { getUsers } from '@/app/lib/actions';
import UserList from '@/app/ui/user/user-list';
import DefaultPage from '../ui/layout/page/default-page';

export default async function Page() {
  const users = await getUsers();

  return (
    <ProtectedRoute>
        <DefaultPage>
            <p className={`${ubuntu.className} text-xl text-gray-800 mb-3 md:text-3xl md:leading-normal`}>
            <strong>Users</strong>
            </p>
            <UserList users={users || []} />
        </DefaultPage>
    </ProtectedRoute>
  );
}
