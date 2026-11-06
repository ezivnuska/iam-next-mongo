// app/ui/layout/screen/simple-screen.tsx

'use client';

import { Suspense } from 'react';
import { Screen } from '@iam/ui';
import UserButton from '@/app/ui/header/user-button';
import SigninButton from '@/app/ui/auth/signin-button';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';
import { PuzzleIcon } from '@/app/ui/icons';

interface SimpleScreenProps {
    children: React.ReactNode;
    showLoading?: boolean;
    loggedIn?: boolean;
}

export default function SimpleScreen({ children, showLoading = true, loggedIn = false }: SimpleScreenProps) {
    return (
        <Screen
            userControls={loggedIn ? <UserButton /> : undefined}
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
            showLoading={showLoading}
        >
            {children}
        </Screen>
    );
}
