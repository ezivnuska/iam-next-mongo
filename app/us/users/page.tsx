// app/us/users/page.tsx

export const dynamic = 'force-dynamic';

import { getUsers } from '@/app/lib/actions/users';
import UserList from '@/app/ui/user/user-list';
import PageHeader from '@/app/ui/layout/page-header';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import PageContent from '@/app/ui/layout/page/page-content';

export default async function Page() {
    // Server-side authentication check
    const session = await auth();
    if (!session) {
        redirect('/?auth=required&callbackUrl=/us/users');
    }

    const users = await getUsers();

    return (
        <PageContent>
            <PageHeader title='Users' />
            <UserList users={users || []} />
        </PageContent>
    );
}
