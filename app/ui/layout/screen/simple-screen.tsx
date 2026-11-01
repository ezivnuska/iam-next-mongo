// app/ui/layout/screen/simple-screen.tsx

'use client';

import { Suspense } from 'react';
import { Screen } from '@iam/ui';
import UserButton from '@/app/ui/header/user-button';
import ThemeToggle from '@/app/ui/theme/theme-toggle';
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
                    <ThemeToggle />
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
