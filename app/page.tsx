export const dynamic = 'force-dynamic';

import { auth } from '@/app/lib/auth';
import { redirect } from 'next/navigation';
import { getUserContent } from '@/app/lib/actions/user-content';
import { fetchUserByUsername } from '@/app/lib/actions/users';
import ProfilePage from '@/app/ui/user/profile-page';
import WelcomeScreen from '@/app/ui/auth/welcome-screen';

export default async function Page() {
    const session = await auth();

    if (!session?.user?.username) {
        return <WelcomeScreen />;
    }

    const { username } = session.user;
    const [content, profileUser] = await Promise.all([
        getUserContent(username),
        fetchUserByUsername(username),
    ]);

    if (!profileUser) redirect('/whois');

    return (
        <ProfilePage
            username={username}
            userId={profileUser.id}
            isOwnProfile
            initialContent={content}
            avatar={profileUser.avatar}
        />
    );
}
