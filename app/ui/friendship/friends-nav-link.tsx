'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserGroupIcon } from '@heroicons/react/24/solid';
import { getPendingRequests } from '@/app/lib/actions/friendships';
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents';
import type { FriendRequestPayload, FriendshipStatusPayload } from '@/app/lib/socket/events';

export default function FriendsNavLink() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        getPendingRequests().then(r => setCount(r.length)).catch(() => {});
    }, []);

    useFriendshipSocketEvents({
        isCurrentUser: true,
        onFriendRequestSent: (_payload: FriendRequestPayload) => setCount(n => n + 1),
        onFriendRequestAccepted: (_payload: FriendshipStatusPayload) => setCount(n => Math.max(0, n - 1)),
        onFriendshipRemoved: (_payload: FriendshipStatusPayload) => setCount(n => Math.max(0, n - 1)),
    });

    return (
        <Link
            href='/friends'
            className='relative flex items-center justify-center text-gray-700 hover:text-gray-500 transition-colors'
            aria-label='Friends'
        >
            <UserGroupIcon className='w-7 h-7' />
            {count > 0 && (
                <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none'>
                    {count}
                </span>
            )}
        </Link>
    );
}
