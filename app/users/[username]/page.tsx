// app/users/[username]/page.tsx

import ProtectedRoute from '@/app/ui/auth/protected-route';
import Main from '@/app/ui/layout/main';
import UserProfileCard from '@/app/ui/user/user-profile-card';
import UserContentFeed from '@/app/ui/user/user-content-feed';
import Breadcrumbs from '@/app/ui/layout/breadcrumbs';
import { getUserContent } from '@/app/lib/actions/user-content';

interface Props {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: Props) {
    const { username } = await params;
    const content = await getUserContent(username);

    return (
        <ProtectedRoute>
            <Main>
                <Breadcrumbs
                    breadcrumbs={[
                        { label: "Users", href: "/users" },
                        { label: username, href: `/users/${username}`, active: true },
                        { label: "Images", href: `/users/${username}/images` },
                    ]}
                />
                <UserProfileCard username={username} />
                <UserContentFeed initialContent={content} />
            </Main>
        </ProtectedRoute>
    );
}
