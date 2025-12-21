// app/ui/layout/screen/default-screen.tsx

'use client';

import { useState, Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import { useContentLoaded } from '@/app/hooks/useContentLoaded';
import { clsx } from 'clsx';
import Brand from '@/app/ui/header/brand';
import UserButton from '@/app/ui/header/user-button';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';
import LoadingSpinner from '@/app/ui/loading-spinner';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import NavLinkListSliding from '@/app/ui/header/nav-link-list-sliding';

interface DefaultScreenProps {
    children: React.ReactNode;
    headerClassName?: string;
    drawerClassName?: string;
    fullscreen?: boolean;
    showLoading?: boolean;
}

export default function DefaultScreen({
    children,
    headerClassName = '',
    drawerClassName = 'bg-gray-800',
    fullscreen = false,
    showLoading = true,
}: DefaultScreenProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showDrawerContent, setShowDrawerContent] = useState(false);
    const pathname = usePathname();
    const horizontalLayout = useHorizontalLayout();
    const isContentLoaded = useContentLoaded();

    // Handle drawer animation: expand height first, then fade in content
    useEffect(() => {
        if (isDrawerOpen) {
            // Wait for height animation to complete before showing content
            const timer = setTimeout(() => {
                setShowDrawerContent(true);
            }, 300); // Match transition duration
            return () => clearTimeout(timer);
        } else {
            // Hide content immediately when closing
            setShowDrawerContent(false);
        }
    }, [isDrawerOpen]);

    // Close drawer when pathname changes (after navigation)
    useEffect(() => {
        setIsDrawerOpen(false);
    }, [pathname]);

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };

    // Calculate drawer dimensions based on layout
    const drawerMaxHeight = '100vh';
    const drawerMaxWidth = horizontalLayout ? 'calc(100vw - 15vw)' : '100vw';

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

                {/* Fixed Header */}
                <header
                    className={clsx(
                        headerClassName,
                        'shrink-0 overflow-visible z-50 transition-transform duration-500 ease-in-out bg-black',
                        {
                            // Vertical layout - slide up
                            '-translate-y-full': fullscreen && !horizontalLayout,
                            'translate-y-0': !fullscreen || horizontalLayout,
                            // Horizontal layout - slide left
                            '-translate-x-full min-w-[375px]': fullscreen && horizontalLayout,
                            'translate-x-0': !fullscreen || !horizontalLayout,
                            // Responsive sizing based on layout
                            'h-[60px] w-screen': !horizontalLayout,
                            'h-screen w-[15vw]': horizontalLayout,
                        }
                    )}
                >
                    <div className={clsx(
                        'flex h-full items-center justify-between py-3 px-2 gap-4 self-center max-w-[600px] mx-auto',
                        {
                            'flex-row px-3': !horizontalLayout,
                            'flex-col': horizontalLayout,
                        }
                    )}>
                        {/* Brand */}
                        <div className='flex flex-col items-center justify-center gap-4'>
                            <Brand />
                            {horizontalLayout && <UserButton />}
                        </div>

                        {/* Center - Drawer Toggle Button */}
                        <button
                            onClick={toggleDrawer}
                            className='flex flex-1 w-full items-center justify-center rounded-lg hover:text-blue-300 transition-colors text-white cursor-pointer'
                            aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
                        >
                            {isDrawerOpen ?
                                horizontalLayout
                                    ? <ChevronLeftIcon className='w-8 h-8' />
                                    : <ChevronUpIcon className='w-8 h-8' />
                                : horizontalLayout
                                    ? <ChevronRightIcon className='w-8 h-8' />
                                    : <ChevronDownIcon className='w-8 h-8' />
                            }
                        </button>

                        {!horizontalLayout && (
                            <div className='flex flex-row items-center justify-end'>
                                <UserButton />
                            </div>
                        )}
                    </div>

                    {/* Expandable Drawer */}
                    <div
                        className={clsx(
                            drawerClassName,
                            'absolute overflow-hidden transition-all duration-300 ease-in-out',
                            {
                                // Vertical layout - expand downward
                                'left-0 right-0 top-full': !horizontalLayout,
                                // Horizontal layout - expand to the right
                                'top-0 bottom-0 left-full': horizontalLayout,
                            }
                        )}
                        style={{
                            ...(!horizontalLayout
                                ? { height: isDrawerOpen ? drawerMaxHeight : '0px', width: '100%' }
                                : { width: isDrawerOpen ? drawerMaxWidth : '0px', height: '100%' }
                            ),
                        }}
                    >
                        {/* Drawer Content with Fade Animation */}
                        <div
                            className={clsx(
                                'flex flex-1 h-full flex-row items-stretch justify-stretch transition-opacity duration-200',
                                {
                                    'opacity-100': showDrawerContent,
                                    'opacity-0': !showDrawerContent,
                                }
                            )}
                        >
                            {/* <NavLinkList onLinkClick={() => {}} /> */}
                            <NavLinkListSliding isVisible={showDrawerContent} />
                        </div>
                    </div>
                </header>

                {/* Main Content Container */}
                <main className='flex flex-col flex-1 w-full min-h-0 min-w-0 overflow-hidden'>
                    {showLoading && !isContentLoaded ? (
                        <LoadingSpinner />
                    ) : (
                        <Suspense fallback={<LoadingSpinner />}>
                            <div className='flex flex-col flex-1 min-h-0 min-w-0 overflow-auto'>
                                {children}
                            </div>
                        </Suspense>
                    )}
                </main>
            </div>
        </div>
    );
}
