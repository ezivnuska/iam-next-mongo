'use client';

import { Suspense } from 'react';
import clsx from 'clsx';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';
import { useContentLoaded } from '../hooks/use-content-loaded';
import { BreadcrumbProvider } from '../providers/breadcrumb-provider';
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

    const content = showLoading && !isContentLoaded
        ? <LoadingSpinner />
        : <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;

    return (
        <BreadcrumbProvider>
            {extras}
            {horizontalLayout ? (
                <>
                    <aside className={clsx(
                        'fixed left-0 top-0 h-dvh w-24 flex flex-col py-4 px-2 bg-gray-100 z-10',
                        { 'justify-between': loggedIn || !!nav },
                    )}>
                        {loggedIn ? (
                            <>
                                <div>{userControls}</div>
                                <div className='flex flex-col items-center gap-4'>
                                    {nav}
                                    <Brand href={brandHref} compact />
                                </div>
                            </>
                        ) : (
                            <>
                                <Brand href={brandHref} compact />
                                {nav && <div>{nav}</div>}
                            </>
                        )}
                    </aside>
                    <main className='ml-24 flex flex-col min-h-dvh overflow-x-hidden bg-white'>
                        {content}
                    </main>
                </>
            ) : (
                <>
                    <header className='sticky top-0 z-10 bg-gray-100 border-b border-gray-200'>
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
                    </header>
                    <main className='flex flex-col min-h-dvh overflow-x-hidden bg-white'>
                        {content}
                    </main>
                </>
            )}
        </BreadcrumbProvider>
    );
}
