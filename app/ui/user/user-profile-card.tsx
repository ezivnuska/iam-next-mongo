// app/ui/user-profile-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import BioForm from '@/app/profile/bio-form';
import type { User } from '@/app/lib/definitions';

interface UserProfileCardProps {
  username?: string;
}

export default function UserProfileCard({ username }: UserProfileCardProps) {
    const { user: currentUser, fetchUserByUsername } = useUser();
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    // Determine if we're showing the current user's profile or another user's
    const isCurrentUser = !username || username === currentUser?.username;
    const displayUser = isCurrentUser ? currentUser : profileUser;

    useEffect(() => {
        // If showing current user, no need to fetch
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

    return (
        <div className='flex flex-1 flex-row flex-wrap gap-4'>
            <div className='w-[64px] h-[64px]'>
                <UserAvatar
                    username={displayUser.username}
                    avatar={displayUser.avatar}
                    size={64}
                />
            </div>
            <div className='flex flex-1 flex-col gap-2'>
                <h1 className='text-2xl font-bold'>
                    {displayUser.username}
                </h1>

                <div className='flex flex-1 flex-row items-start gap-4 pr-1'>
                    <p className='flex flex-1 text-gray-200'>
                        {displayUser.bio || ''}
                    </p>
                    {isCurrentUser && <BioForm />}
                </div>
            </div>
        </div>
    );
}
