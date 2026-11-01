// app/ui/layout/screen/simple-screen.tsx

'use client';

import { Suspense } from 'react';
import { Screen } from '@iam/ui';
import UserButton from '@/app/ui/header/user-button';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';

interface SimpleScreenProps {
    children: React.ReactNode;
    showLoading?: boolean;
}

export default function SimpleScreen({ children, showLoading = true }: SimpleScreenProps) {
    return (
        <Screen
            headerRight={
                <>
                    <a
                        href='https://games.iameric.me'
                        className='flex items-center justify-center h-10 rounded-full px-4 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors'
                    >
                        games
                    </a>
                    <UserButton />
                </>
            }
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
