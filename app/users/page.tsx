// app/users/page.tsx

import { getUsers } from '@/app/lib/actions';
import UserList from '@/app/ui/user/user-list';
import DefaultPage from '../ui/layout/page/default-page';
import PageHeader from '@/app/ui/layout/page-header';
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
            <PageHeader title="Users" />
            <UserList users={users || []} />
        </DefaultPage>
    );
}
