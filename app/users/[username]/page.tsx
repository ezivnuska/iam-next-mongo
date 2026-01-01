// app/users/[username]/page.tsx

export const dynamic = 'force-dynamic';

import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import UserProfileCard from '@/app/ui/user/user-profile-card';
import UserContentFeed from '@/app/ui/user/user-content-feed';
import Breadcrumbs from '@/app/ui/layout/breadcrumbs';
import { getUserContent } from '@/app/lib/actions/user-content';
import PageContent from '@/app/ui/layout/page/page-content';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: Props) {
    const { username } = await params;
    const session = await auth();
    if (!session) {
        redirect(`/?auth=required&callbackUrl=/users/${username}`);
    }

    const content = await getUserContent(username);

    // Check if viewing own profile
    const isOwnProfile = session.user?.username === username;

    return (
        <PageContent>
            <Breadcrumbs
                breadcrumbs={[
                    { label: 'Users', href: '/users' },
                    { label: username, href: `/users/${username}`, active: true },
                    { label: 'Images', href: `/users/${username}/images` },
                ]}
            />
            <UserProfileCard username={username} />
            <UserContentFeed initialContent={content} editable={isOwnProfile} />
        </PageContent>
    );
}
