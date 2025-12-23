// app/us/users/[username]/images/page.tsx

export const dynamic = 'force-dynamic';

import Breadcrumbs from '@/app/ui/layout/breadcrumbs';
import ImagesClient from '@/app/ui/images/images-client';
import { fetchUserByUsername } from '@/app/lib/actions/users';
import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import PageContent from '@/app/ui/layout/page/page-content';

interface Props {
    params: Promise<{ username: string }>;
}

export default async function Page({ params }: Props) {
    // Server-side authentication check
    const session = await auth();
    const { username } = await params;

    if (!session) {
        redirect(`/?auth=required&callbackUrl=/us/users/${username}/images`);
    }

    const user = await fetchUserByUsername(username);
    if (!user) return null;
    const { id } = user;

    return (
        <PageContent>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Users', href: `/us/users` },
                    { label: username, href: `/us/users/${username}` },
                    { label: 'Images', href: `/us/users/${username}/images`, active: true },
                ]}
            />
            <ImagesClient userId={id} />
        </PageContent>
    );
}
