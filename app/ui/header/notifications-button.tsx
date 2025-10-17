// app/ui/header/notifications-button.tsx

'use client';

import { BellIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import { useUser } from '@/app/lib/providers/user-provider';

export default function NotificationsButton() {
    const pathname = usePathname();
    const { socket } = useSocket();
    const { user } = useUser();
    const [unreadCount, setUnreadCount] = useState(0);
    const [lastVisitedActivities, setLastVisitedActivities] = useState<string | null>(null);

    // Load last visited timestamp from localStorage
    useEffect(() => {
        const lastVisited = localStorage.getItem('lastVisitedActivity');
        setLastVisitedActivities(lastVisited);

        // Fetch initial unread count
        if (user?.id && lastVisited) {
            fetch(`/api/activity/unread?since=${lastVisited}`)
                .then(res => res.json())
                .then(data => setUnreadCount(data.count || 0))
                .catch(err => console.error('Failed to fetch unread count:', err));
        }
    }, [user?.id]);

    // Listen for new activities via socket
    useEffect(() => {
        if (!socket) return;

        const handleNewActivity = () => {
            setUnreadCount(prev => prev + 1);
        };

        socket.on(SOCKET_EVENTS.ACTIVITY_CREATED, handleNewActivity);

        return () => {
            socket.off(SOCKET_EVENTS.ACTIVITY_CREATED, handleNewActivity);
        };
    }, [socket]);

    // Clear unread count when visiting activity page
    useEffect(() => {
        if (pathname === '/activity') {
            setUnreadCount(0);
            const now = new Date().toISOString();
            localStorage.setItem('lastVisitedActivity', now);
            setLastVisitedActivities(now);
        }
    }, [pathname]);

    return (
        <Link
            href='/activity'
            className={clsx(
                'relative flex flex-col items-center justify-center rounded-md bg-gray-50 text-sm font-medium m-1 py-1 px-3 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start',
                {
                    'bg-sky-100 text-blue-600': pathname === '/activity',
                },
            )}
        >
            <BellIcon className="w-6 self-center" />
            <p className="text-xs hidden md:block">Activity</p>
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[1.25rem]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
