// app/ui/user-profile-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/app/lib/providers/user-provider';
import UserIdentity from '@/app/ui/user/user-identity';
import UserBio from '@/app/ui/user/user-bio';
import type { User } from '@/app/lib/definitions';

interface UserProfileCardProps {
  username?: string;
}

export default function UserProfileCard({ username }: UserProfileCardProps) {
    const { user: currentUser, fetchUserByUsername } = useUser();
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    const isCurrentUser = !username || username === currentUser?.username;
    const displayUser = isCurrentUser ? currentUser : profileUser;

    useEffect(() => {
        if (isCurrentUser) return;

        let mounted = true;

        async function loadUser() {
            if (!username) return;

            setLoading(true);
            try {
                const profile = await fetchUserByUsername(username);
                if (mounted) setProfileUser(profile);
            } catch (err) {
                console.error('Failed to fetch user profile:', err);
                if (mounted) setProfileUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadUser();
        return () => { mounted = false; };
    }, [username, isCurrentUser, fetchUserByUsername]);

    if (loading) return <p>Loading...</p>;
    if (!displayUser) return <p>User not found</p>;

    if (isCurrentUser) {
        return <UserBio bio={displayUser.bio} editable />;
    }

    return (
        <div className='flex flex-col gap-2'>
            <UserIdentity username={displayUser.username} avatar={displayUser.avatar} />
            <UserBio bio={displayUser.bio} />
        </div>
    );
}
