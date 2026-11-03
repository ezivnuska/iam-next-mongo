'use client';

import { Suspense } from 'react';
import clsx from 'clsx';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';
import { useContentLoaded } from '../hooks/use-content-loaded';
import { BreadcrumbProvider } from '../providers/breadcrumb-provider';
import Brand from './brand';
import BreadcrumbNav from './breadcrumb-nav';
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
        <BreadcrumbProvider>
            <div className='w-screen h-screen flex overflow-hidden bg-yellow-300'>
                <div className={clsx('flex w-full m-2', {
                    'flex-col': !horizontalLayout,
                    'flex-row': horizontalLayout,
                })}>
                    {extras}

                    <div className={clsx('flex shrink-0', {
                        'flex-col w-full': !horizontalLayout,
                        'flex-col py-4 px-4': horizontalLayout,
                        'justify-between': horizontalLayout && (loggedIn || !!nav),
                    })}>
                        {horizontalLayout ? (
                            loggedIn ? (
                                <>
                                    <div>{userControls}</div>
                                    <BreadcrumbNav />
                                    <div className='flex flex-col items-center gap-4'>
                                        {nav}
                                        <Brand href={brandHref} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Brand href={brandHref} />
                                    <BreadcrumbNav />
                                    {nav && <div>{nav}</div>}
                                </>
                            )
                        ) : (
                            <>
                                <div className='flex flex-row items-center justify-between py-2 gap-4 px-4'>
                                    {loggedIn ? (
                                        <>
                                            <div>{userControls}</div>
                                            <div className='flex flex-row items-center gap-4'>
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
                                <BreadcrumbNav />
                            </>
                        )}
                    </div>

                    <main className={clsx('flex flex-col flex-1 w-full min-h-0 min-w-0 overflow-auto rounded-t-2xl bg-white', {
                        'py-5': horizontalLayout,
                    })}>
                        {showLoading && !isContentLoaded
                            ? <LoadingSpinner />
                            : <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>}
                    </main>
                </div>
            </div>
        </BreadcrumbProvider>
    );
}
