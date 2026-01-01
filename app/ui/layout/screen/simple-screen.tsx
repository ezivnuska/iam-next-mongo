// app/ui/layout/screen/simple-screen.tsx

'use client';

import { Suspense } from 'react';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import { useContentLoaded } from '@/app/hooks/useContentLoaded';
import { clsx } from 'clsx';
import Brand from '@/app/ui/header/brand';
import UserButton from '@/app/ui/header/user-button';
import ThemeToggle from '@/app/ui/theme/theme-toggle';
import LoadingSpinner from '@/app/ui/loading-spinner';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';

interface SimpleScreenProps {
    children: React.ReactNode;
    showLoading?: boolean;
}

export default function SimpleScreen({
    children,
    showLoading = true,
}: SimpleScreenProps) {
    const horizontalLayout = useHorizontalLayout();
    const isContentLoaded = useContentLoaded();

    return (
        <div className={clsx(
            'w-screen h-screen flex overflow-hidden'
        )}>
            <div className={clsx('flex w-full', {
                'flex-col': !horizontalLayout,
                'flex-row': horizontalLayout,
            })}>
                <Suspense fallback={null}>
                    <AuthRedirectHandler />
                </Suspense>

                <div className={clsx('flex shrink-0 max-w-[600px] mx-auto items-center py-2 gap-4 px-4', {
                    'flex-row w-full justify-between': !horizontalLayout,
                    'flex-col py-4 px-4': horizontalLayout,
                })}>
                    <Brand />
                    <div className={clsx('flex items-center gap-6', {
                        'flex-col-reverse items-between': horizontalLayout,
                    })}>
                        <ThemeToggle />
                        <UserButton />
                    </div>
                </div>

                {/* Main Content Container */}
                <main className={clsx('flex flex-col flex-1 w-full min-h-0 min-w-0 overflow-auto', {
                    'py-5': horizontalLayout,
                })}>
                    {showLoading && !isContentLoaded
                        ? <LoadingSpinner />
                        : <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
                    }
                </main>
            </div>
        </div>
    );
}
