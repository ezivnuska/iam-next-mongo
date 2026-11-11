// app/users/page.tsx

export const dynamic = 'force-dynamic';

import { getUsers } from '@/app/lib/actions/users';
import UserList from '@/app/ui/user/user-list';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { PageContent, PageContentList } from '@iam/ui';

export default async function Page() {
    // Server-side authentication check
    const session = await auth();
    if (!session) {
        redirect('/?auth=required&callbackUrl=/users');
    }

    const users = await getUsers();

    return (
        <PageContent>
            <PageContentList>
                <UserList users={users || []} />
            </PageContentList>
        </PageContent>
    );
}
