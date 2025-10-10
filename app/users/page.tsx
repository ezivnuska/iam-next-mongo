// app/users/page.tsx

import { lusitana } from '@/app/ui/fonts';
import ProtectedRoute from '@/app/ui/protected-route';
import { getUsers } from '@/app/lib/actions';
import Main from '../ui/main';
import Link from 'next/link';
import Avatar from '../ui/avatar';

export default async function Page() {
  const users = await getUsers();

  return (
    <ProtectedRoute>
      <Main>
        <p className={`${lusitana.className} text-xl text-gray-800 mb-3 md:text-3xl md:leading-normal`}>
          <strong>Users</strong>
        </p>
        <div>
          {users?.length
            ? (
                users.map(user => (
                    <div key={user.username} className='flex flex-row gap-2 pb-3'>
                        <Avatar
                            avatar={user.avatar}
                            size={30}
                            className='h-[30px border-1'
                        />
                        <Link
                            key={user.id}
                            href={`/users/${user.username}`}
                            className='block'
                        >
                            {user.username}
                        </Link>
                    </div>
                ))
            ) 
            : <p>No users</p>
          }
        </div>
      </Main>
    </ProtectedRoute>
  );
}
