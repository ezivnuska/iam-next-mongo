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
                    className='flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors'
                    aria-label='Games'
                >
                    <PuzzleIcon className='w-5 h-5' />
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
