// app/users/[username]/images/page.tsx

export const dynamic = 'force-dynamic';

import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { PageContent, PageContentRow } from '@iam/ui';
import UserImagesPanel from '@/app/ui/user/user-images-panel';

interface Props {
    params: Promise<{ username: string }>;
}

export default async function Page({ params }: Props) {
    const session = await auth();
    const { username } = await params;

    if (!session) {
        redirect(`/?auth=required&callbackUrl=/users/${username}/images`);
    }

    const isOwnImages = session.user?.username === username;

    return (
        <PageContent>
            <PageContentRow className='py-4'>
                <UserImagesPanel username={username} authorized={isOwnImages} />
            </PageContentRow>
        </PageContent>
    );
}
