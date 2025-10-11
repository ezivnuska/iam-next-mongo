// app/users/[username]/page.tsx

import ProtectedRoute from '@/app/ui/auth/protected-route';
import Main from '@/app/ui/layout/main';
import UserProfileCard from '@/app/ui/user/user-profile-card';
import Breadcrumbs from '@/app/ui/layout/breadcrumbs';

interface Props {
  params: { username: string };
}

export default async function UserProfilePage({ params }: Props) {
    const { username } = await params
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
            </Main>
        </ProtectedRoute>
    );
}
