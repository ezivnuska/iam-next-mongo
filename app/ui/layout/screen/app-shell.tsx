// app/ui/layout/screen/app-shell.tsx

'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Screen, FooterProvider, useFooter, useAppHeight } from '@iam/ui';
import UserButton from '@/app/ui/header/user-button';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';
import { useUser } from '@/app/lib/providers/user-provider';
import { getBestVariant } from '@iam/shared-types';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { useSocketListener } from '@/app/lib/hooks/use-socket-listener';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import { getUnreadCount } from '@/app/lib/actions/messages';
import type { MessageSentPayload } from '@/app/lib/socket/events';

function ChatIcon({ className }: { className?: string }) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className={className}>
            <path strokeLinecap='round' strokeLinejoin='round' d='M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z' />
        </svg>
    );
}

function PuzzleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24' className={className}>
            <path d='M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875c-1.243 0-2.25.84-2.25 1.875 0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.036 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z' />
        </svg>
    );
}

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    return (
        <FooterProvider>
            <AppShellInner>{children}</AppShellInner>
        </FooterProvider>
    );
}

function AppShellInner({ children }: AppShellProps) {
    const { footer } = useFooter();
    const { user } = useUser();
    const loggedIn = !!user && !user.isGuest;
    const [headerReady, setHeaderReady] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const { socket } = useSocket();
    const pathname = usePathname();

    useEffect(() => {
        if (!loggedIn) {
            setHeaderReady(true);
            return;
        }
        setHeaderReady(false);
        const isFullUser = !!(user?.createdAt);
        if (!isFullUser) return;
        const avatarUrl = user?.avatar ? getBestVariant(user.avatar, 40)?.url : null;
        if (!avatarUrl) {
            setHeaderReady(true);
            return;
        }
        const img = new window.Image();
        img.onload = () => setHeaderReady(true);
        img.onerror = () => setHeaderReady(true);
        img.src = avatarUrl;
        return () => { img.onload = null; img.onerror = null; };
    }, [loggedIn, user?.createdAt, user?.avatar]);

    useEffect(() => {
        if (!loggedIn) return;
        getUnreadCount().then(setUnreadMessages).catch(() => {});
    }, [loggedIn]);

    useSocketListener<MessageSentPayload>(socket, SOCKET_EVENTS.MESSAGE_SENT, () => {
        if (pathname !== '/messages') setUnreadMessages((n) => n + 1);
    });

    useEffect(() => {
        if (pathname === '/messages') setUnreadMessages(0);
    }, [pathname]);

    useAppHeight();

    return (
        <Screen
            headerReady={headerReady}
            footer={footer}
            chromeVisible={loggedIn}
            userControls={loggedIn ? <UserButton /> : undefined}
            nav={loggedIn ? (
                <div className='flex flex-row landscape:flex-col gap-4'>
                    <a
                        href='/messages'
                        className='relative flex items-center justify-center text-gray-300 hover:text-white transition-colors'
                        aria-label='Messages'
                    >
                        <ChatIcon className='w-7 h-7' />
                        {unreadMessages > 0 && (
                            <span className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center leading-none'>
                                {unreadMessages > 9 ? '9+' : unreadMessages}
                            </span>
                        )}
                    </a>
                    <a
                        href={process.env.NEXT_PUBLIC_GAMES_URL ?? 'https://games.iameric.me'}
                        className='flex items-center justify-center text-gray-300 hover:text-white transition-colors'
                        aria-label='Games'
                    >
                        <PuzzleIcon className='w-7 h-7' />
                    </a>
                </div>
            ) : undefined}
            extras={
                <Suspense fallback={null}>
                    <AuthRedirectHandler />
                </Suspense>
            }
            brandHref='/whois'
        >
            {children}
        </Screen>
    );
}
