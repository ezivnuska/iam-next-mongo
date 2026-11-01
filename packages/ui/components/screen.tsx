'use client';

import { Suspense } from 'react';
import clsx from 'clsx';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';
import { useContentLoaded } from '../hooks/use-content-loaded';
import Brand from './brand';
import LoadingSpinner from './loading-spinner';
import SiteSwitcher from './site-switcher';

interface ScreenProps {
    children: React.ReactNode;
    headerRight?: React.ReactNode;
    extras?: React.ReactNode;
    showLoading?: boolean;
    brandLines?: [string, string];
}

export default function Screen({
    children,
    headerRight,
    extras,
    showLoading = true,
    brandLines,
}: ScreenProps) {
    const horizontalLayout = useHorizontalLayout();
    const isContentLoaded = useContentLoaded();

    return (
        <div className='w-screen h-screen flex overflow-hidden'>
            <SiteSwitcher />
            <div className={clsx('flex w-full', {
                'flex-col': !horizontalLayout,
                'flex-row': horizontalLayout,
            })}>
                {extras}

                <div className={clsx('flex shrink-0 max-w-content mx-auto items-center py-2 gap-4 px-4', {
                    'flex-row w-full justify-between': !horizontalLayout,
                    'flex-col py-4 px-4': horizontalLayout,
                })}>
                    <Brand lines={brandLines} />
                    {headerRight && (
                        <div className={clsx('flex items-center gap-6', {
                            'flex-col-reverse': horizontalLayout,
                        })}>
                            {headerRight}
                        </div>
                    )}
                </div>

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
