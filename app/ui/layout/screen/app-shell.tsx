// app/ui/layout/screen/app-shell.tsx

'use client';

import { Suspense, useEffect, useState } from 'react';
import { Screen, useHorizontalLayout } from '@iam/ui';
import UserButton from '@/app/ui/header/user-button';
import SigninButton from '@/app/ui/auth/signin-button';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';
import { useUser } from '@/app/lib/providers/user-provider';
import { FooterProvider, useFooter } from '@/app/lib/providers/footer-provider';
import { getBestVariant } from '@iam/shared-types';

function PuzzleIcon({ className }: { className?: string }) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24' className={className}>
            <path d='M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875c-1.243 0-2.25.84-2.25 1.875 0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.036 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z' />
        </svg>
    );
}

interface AppShellProps {
    children: React.ReactNode;
    showLoading?: boolean;
}

export default function AppShell({ children, showLoading = true }: AppShellProps) {
    return (
        <FooterProvider>
            <AppShellInner showLoading={showLoading}>{children}</AppShellInner>
        </FooterProvider>
    );
}

function AppShellInner({ children, showLoading = true }: AppShellProps) {
    const { footer } = useFooter();
    const { user } = useUser();
    const horizontalLayout = useHorizontalLayout();
    const loggedIn = !!user && !user.isGuest;
    const [headerReady, setHeaderReady] = useState(false);

    useEffect(() => {
        if (!loggedIn) {
            setHeaderReady(true);
            return;
        }
        setHeaderReady(false);
        const isFullUser = !!(user?.createdAt);
        if (!isFullUser) return;
        const avatarUrl = user?.avatar ? getBestVariant(user.avatar, 36)?.url : null;
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
        const sync = () => document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
        sync();
        window.addEventListener('resize', sync);
        return () => window.removeEventListener('resize', sync);
    }, []);

    return (
        <Screen
            headerReady={headerReady}
            footer={footer}
            userControls={loggedIn ? (
                <div className={horizontalLayout ? 'flex flex-col items-center gap-4' : 'flex flex-row items-center gap-3'}>
                    <UserButton />
                    <a
                        href='/settings'
                        className='flex items-center justify-center text-gray-700 hover:text-gray-500 transition-colors'
                        aria-label='Settings'
                    >
                        <svg xmlns='http://www.w3.org/2000/svg' className='w-6 h-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <circle cx='12' cy='12' r='3' />
                            <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
                        </svg>
                    </a>
                </div>
            ) : undefined}
            nav={loggedIn ? (
                <a
                    href='https://games.iameric.me'
                    className='flex items-center justify-center text-gray-700 hover:text-gray-500 transition-colors'
                    aria-label='Games'
                >
                    <PuzzleIcon className='w-7 h-7' />
                </a>
            ) : (
                <SigninButton />
            )}
            extras={
                <Suspense fallback={null}>
                    <AuthRedirectHandler />
                </Suspense>
            }
            brandHref='/whois'
            showLoading={showLoading}
        >
            {children}
        </Screen>
    );
}
