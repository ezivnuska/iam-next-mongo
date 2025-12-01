// app/users/page.tsx

import { ubuntu } from '@/app/ui/fonts';
import { getUsers } from '@/app/lib/actions';
import UserList from '@/app/ui/user/user-list';
import DefaultPage from '../ui/layout/page/default-page';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  // Server-side authentication check
  const session = await auth();
  if (!session) {
    redirect("/?auth=required&callbackUrl=/users");
  }

  const users = await getUsers();

  return (
    <DefaultPage>
      <p className={`${ubuntu.className} text-xl text-gray-800 mb-3 md:text-3xl md:leading-normal`}>
        <strong>Users</strong>
      </p>
      <UserList users={users || []} />
    </DefaultPage>
  );
}
