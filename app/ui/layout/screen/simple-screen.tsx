// app/ui/layout/screen/simple-screen.tsx

'use client';

import { useState, Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import { useContentLoaded } from '@/app/hooks/useContentLoaded';
import { clsx } from 'clsx';
import Brand from '@/app/ui/header/brand';
import UserButton from '@/app/ui/header/user-button';
import ThemeToggle from '@/app/ui/theme/theme-toggle';
import ThemeDebug from '@/app/ui/theme/theme-debug';
import LoadingSpinner from '@/app/ui/loading-spinner';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import SimpleBrand from '../../simple-brand';

interface SimpleScreenProps {
    children: React.ReactNode;
    headerClassName?: string;
    drawerClassName?: string;
    fullscreen?: boolean;
    showLoading?: boolean;
}

export default function SimpleScreen({
    children,
    showLoading = true,
}: SimpleScreenProps) {
    const pathname = usePathname();
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

                <div className={clsx('flex shrink-0 max-w-[600px] mx-auto items-center py-2 gap-4 px-2', {
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
                    'py-6': horizontalLayout,
                })}>
                    {showLoading && !isContentLoaded
                        ? <LoadingSpinner />
                        : <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
                    }
                </main>
            </div>
            <ThemeDebug />
        </div>
    );
}
