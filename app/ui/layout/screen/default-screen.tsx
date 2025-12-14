// app/ui/layout/screen/default-screen.tsx

'use client';

import { useState, Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useScreenOrientation } from '@/app/games/poker/lib/hooks/use-screen-orientation';
import { clsx } from 'clsx';
import Brand from '@/app/ui/header/brand';
import UserButton from '@/app/ui/header/user-button';
import NavLinkList from '@/app/ui/header/nav-link-list';
import AuthRedirectHandler from '@/app/ui/auth/auth-redirect-handler';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface DefaultScreenProps {
    children: React.ReactNode;
    headerClassName?: string;
    drawerClassName?: string;
    fullscreen?: boolean;
    showLoading?: boolean;
}

// Loading spinner component
const LoadingSpinner = () => (
    <div className='absolute inset-0 flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
            <div className='inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4' />
            <p className='text-gray-600'>Loading...</p>
        </div>
    </div>
);

export default function DefaultScreen({
    children,
    headerClassName = 'bg-gray-900',
    drawerClassName = 'bg-gray-800',
    fullscreen = false,
    showLoading = true,
}: DefaultScreenProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showDrawerContent, setShowDrawerContent] = useState(false);
    const [isContentLoaded, setIsContentLoaded] = useState(false);
    const orientation = useScreenOrientation();
    const isPortrait = orientation === 'portrait';
    const pathname = usePathname();

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

    // Mark content as loaded after initial render
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsContentLoaded(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Close drawer when pathname changes (after navigation)
    useEffect(() => {
        setIsDrawerOpen(false);
    }, [pathname]);

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen);
    };

    // Calculate header dimensions based on orientation
    const headerHeight = isPortrait ? '7.5vh' : '100vh';
    const headerWidth = isPortrait ? '100vw' : '15vw';
    const drawerMaxHeight = isPortrait ? '50vh' : '100vh';
    const drawerMaxWidth = isPortrait ? '100vw' : '35vw';

    return (
        <div className={clsx(
            'w-full h-screen flex overflow-hidden',
            {
                'flex-col': isPortrait,
                'flex-row': !isPortrait,
            }
        )}>
            <Suspense fallback={null}>
                <AuthRedirectHandler />
            </Suspense>

            {/* Fixed Header */}
            <header
                className={clsx(
                    headerClassName,
                    'shrink-0 overflow-visible z-50 transition-transform duration-500 ease-in-out',
                    {
                        // Portrait mode - slide up
                        '-translate-y-full': fullscreen && isPortrait,
                        'translate-y-0': !fullscreen || !isPortrait,
                        // Landscape mode - slide left
                        '-translate-x-full': fullscreen && !isPortrait,
                        'translate-x-0': !fullscreen || isPortrait,
                    }
                )}
                style={{
                    height: headerHeight,
                    width: headerWidth,
                }}
            >
                <div className={clsx(
                    'flex h-full items-center justify-between p-2 gap-4 self-center',
                    {
                        'flex-row': isPortrait,
                        'h-full flex-col': !isPortrait,
                    }
                )}>
                    {/* Brand */}
                    <div className='flex flex-col items-center justify-center gap-4'>
                        <Brand />
                        {!isPortrait && <UserButton />}
                    </div>

                    {/* Center - Drawer Toggle Button */}
                    <button
                        onClick={toggleDrawer}
                        className='flex flex-1 w-full items-center justify-center rounded-lg hover:text-blue-300 transition-colors text-white'
                        aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
                    >
                        {isDrawerOpen ?
                            !isPortrait
                                ? <ChevronLeftIcon className='w-8 h-8' />
                                : <ChevronUpIcon className='w-8 h-8' />
                            : !isPortrait
                                ? <ChevronRightIcon className='w-8 h-8' />
                                : <ChevronDownIcon className='w-8 h-8' />
                            }
                    </button>

                    {isPortrait && (
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
                            // Portrait mode - expand downward
                            'left-0 right-0 top-full': isPortrait,
                            // Landscape mode - expand to the right
                            'top-0 bottom-0 left-full': !isPortrait,
                        }
                    )}
                    style={{
                        ...(isPortrait
                            ? { height: isDrawerOpen ? drawerMaxHeight : '0px', width: '100%' }
                            : { width: isDrawerOpen ? drawerMaxWidth : '0px', height: '100%' }
                        ),
                    }}
                >
                    {/* Drawer Content with Fade Animation */}
                    <div
                        className={clsx(
                        'w-full h-full transition-opacity duration-200',
                        {
                            'opacity-100': showDrawerContent,
                            'opacity-0': !showDrawerContent,
                        }
                        )}
                    >
                        <NavLinkList onLinkClick={() => {}} />
                    </div>
                </div>
            </header>

            {/* Main Content Container */}
            <main className='relative flex-1 max-w-[600px] overflow-hidden'>
                {showLoading && !isContentLoaded ? (
                    <LoadingSpinner />
                ) : (
                    <Suspense fallback={<LoadingSpinner />}>
                        <div className='absolute inset-0 w-full h-full overflow-auto p-4'>
                            {children}
                        </div>
                    </Suspense>
                )}
            </main>
        </div>
    );
}
