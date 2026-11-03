'use client';

import { Suspense } from 'react';
import clsx from 'clsx';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';
import { useContentLoaded } from '../hooks/use-content-loaded';
import Brand from './brand';
import LoadingSpinner from './loading-spinner';

interface ScreenProps {
    children: React.ReactNode;
    userControls?: React.ReactNode;
    nav?: React.ReactNode;
    extras?: React.ReactNode;
    showLoading?: boolean;
    brandHref?: string;
}

export default function Screen({
    children,
    userControls,
    nav,
    extras,
    showLoading = true,
    brandHref,
}: ScreenProps) {
    const horizontalLayout = useHorizontalLayout();
    const isContentLoaded = useContentLoaded();
    const loggedIn = !!userControls;

    return (
        <div className='w-screen h-screen flex overflow-hidden'>
            <div className={clsx('flex w-full', {
                'flex-col': !horizontalLayout,
                'flex-row': horizontalLayout,
            })}>
                {extras}

                <div className={clsx('flex shrink-0', {
                    'flex-row w-full max-w-content mx-auto items-center justify-between py-2 gap-4 px-4': !horizontalLayout,
                    'flex-col py-4 px-4': horizontalLayout,
                    'justify-between': horizontalLayout && (loggedIn || !!nav),
                })}>
                    {loggedIn ? (
                        <>
                            <div>{userControls}</div>
                            <div className={clsx('flex items-center gap-4', {
                                'flex-row': !horizontalLayout,
                                'flex-col': horizontalLayout,
                            })}>
                                {nav}
                                <Brand href={brandHref} />
                            </div>
                        </>
                    ) : (
                        <>
                            <Brand href={brandHref} />
                            {nav && <div>{nav}</div>}
                        </>
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
