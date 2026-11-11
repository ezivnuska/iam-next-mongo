// app/users/[username]/page.tsx

export const dynamic = 'force-dynamic';

import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { getUserContent } from '@/app/lib/actions/user-content';
import { fetchUserByUsername } from '@/app/lib/actions/users';
import ProfilePage from '@/app/ui/user/profile-page';

interface Props {
    params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: Props) {
    const { username } = await params;
    const session = await auth();
    if (!session) {
        redirect(`/?auth=required&callbackUrl=/users/${username}`);
    }

    const isOwnProfile = session.user?.username === username;
    const [content, profileUser] = await Promise.all([
        getUserContent(username),
        fetchUserByUsername(username),
    ]);

    if (!profileUser) redirect('/whois');

    return (
        <ProfilePage
            username={username}
            userId={profileUser.id}
            isOwnProfile={isOwnProfile}
            initialContent={content}
        />
    );
}
