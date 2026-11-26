'use client';

import { Suspense, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';
import { useSmallScreen } from '../hooks/use-small-screen';
import { BreadcrumbProvider } from '../providers/breadcrumb-provider';
import Brand from './brand';

export interface ScreenProps {
    children: React.ReactNode;
    userControls?: React.ReactNode;
    nav?: React.ReactNode;
    extras?: React.ReactNode;
    footer?: React.ReactNode;
    brandHref?: string;
    headerReady?: boolean;
    chromeVisible?: boolean;
    centerAside?: boolean;
    layout?: 'default' | 'game';
    headerEnd?: React.ReactNode;
}

export default function Screen({
    children,
    userControls,
    nav,
    extras,
    footer,
    brandHref,
    headerReady = true,
    chromeVisible = true,
    centerAside = false,
    layout = 'default',
    headerEnd,
}: ScreenProps) {
    const horizontalLayout = useHorizontalLayout();
    const loggedIn = !!userControls;
    const navRef = useRef<HTMLElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);

    const isLandscape = horizontalLayout === true;
    const isPortrait = horizontalLayout === false;

    const isSmallScreen = useSmallScreen();

    const leftAsideWidth = isLandscape ? (layout === 'game' ? '10vw' : (isSmallScreen ? '10vw' : '15vw')) : undefined;
    const rightAsideWidth = (isLandscape && layout !== 'game') ? (isSmallScreen ? '10vw' : '15vw') : undefined;
    const mainMaxWidth = (isLandscape && layout !== 'game') ? (isSmallScreen ? '80vw' : '70vw') : undefined;

    const chromeIn = chromeVisible && headerReady;

    useEffect(() => {
        if (isLandscape) {
            document.documentElement.style.setProperty('--nav-height', '0px');
            return;
        }
        const el = navRef.current;
        if (!el) return;
        const sync = () => document.documentElement.style.setProperty('--nav-height', `${el.offsetHeight}px`);
        sync();
        const obs = new ResizeObserver(sync);
        obs.observe(el);
        return () => obs.disconnect();
    }, [isLandscape, isPortrait]);

    useEffect(() => {
        if (!isPortrait || !footer || layout === 'game') {
            document.documentElement.style.setProperty('--footer-height', '0px');
            return;
        }
        const el = footerRef.current;
        if (!el) return;
        const sync = () => document.documentElement.style.setProperty('--footer-height', `${el.offsetHeight}px`);
        sync();
        const obs = new ResizeObserver(sync);
        obs.observe(el);
        return () => obs.disconnect();
    }, [isPortrait, footer]);

    const content = <Suspense fallback={null}>{children}</Suspense>;

    return (
        <BreadcrumbProvider>
            {extras}
            {isLandscape && (
                <aside
                    style={{ width: leftAsideWidth, paddingTop: 'clamp(8px, 2vw, 16px)', paddingBottom: 'clamp(12px, 3vw, 24px)' }}
                    className={clsx(
                        'fixed left-0 top-0 h-dvh flex flex-col bg-gray-900 text-white z-10',
                        'transition-transform duration-500',
                        chromeIn ? 'translate-x-0' : '-translate-x-full',
                    )}
                >
                    <div className={clsx('flex flex-col h-full w-full max-w-[150px] ml-auto px-2', { 'justify-between': loggedIn || !!headerEnd, 'items-center': centerAside })}>
                        {loggedIn ? (
                            <>
                                <div>{userControls}</div>
                                <div className='flex flex-col items-center gap-4'>
                                    <div className='flex flex-col w-full'>{nav}</div>
                                    <Brand href={brandHref} compact short={isSmallScreen} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <Brand href={brandHref} compact short={isSmallScreen} />
                                    {nav && <div className='flex flex-col w-full'>{nav}</div>}
                                </div>
                                {headerEnd && <div>{headerEnd}</div>}
                            </>
                        )}
                    </div>
                </aside>
            )}
            {isPortrait && (
                <header
                    ref={navRef}
                    className={clsx(
                        'fixed top-0 left-0 right-0 z-10 bg-gray-900 text-white border-b border-gray-700',
                        'transition-transform duration-500',
                        chromeIn ? 'translate-y-0' : '-translate-y-full',
                    )}
                >
                    <div className='flex flex-row items-center justify-between py-2 gap-4 px-4 w-full'>
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
                                <div className='flex flex-row items-center gap-2'>
                                    <Brand href={brandHref} />
                                    {nav}
                                </div>
                                {headerEnd && <div>{headerEnd}</div>}
                            </>
                        )}
                    </div>
                </header>
            )}
            <main
                style={{
                    ...(isLandscape ? { marginLeft: leftAsideWidth, marginRight: rightAsideWidth, maxWidth: mainMaxWidth } : {}),
                    ...(isPortrait ? { paddingTop: chromeIn ? 'var(--nav-height)' : '0px' } : {}),
                    ...(isPortrait && footer ? { paddingBottom: chromeIn ? 'var(--footer-height)' : '0px' } : {}),
                }}
                className={clsx(
                    '@container/main flex flex-col flex-1 min-h-0 overflow-x-hidden',
                    isPortrait && 'mx-auto w-full',
                    chromeVisible && 'transition-opacity duration-300',
                    !chromeVisible || headerReady ? 'opacity-100' : 'opacity-0',
                )}
            >
                {content}
            </main>
            {layout !== 'game' && ((footer && isPortrait) || isLandscape) && (
                <div
                    ref={footerRef}
                    style={isLandscape ? { width: rightAsideWidth } : undefined}
                    className={clsx(
                        '@container fixed z-10 bg-gray-900 text-white',
                        'transition-transform duration-500',
                        isPortrait
                            ? clsx('bottom-0 left-0 right-0 border-t border-gray-700', chromeIn ? 'translate-y-0' : 'translate-y-full')
                            : clsx('right-0 top-0 h-dvh', chromeIn ? 'translate-x-0' : 'translate-x-full'),
                    )}
                >
                    {isLandscape ? (
                        <div className='flex flex-col h-full w-full max-w-[150px] mr-auto px-2'>
                            {footer}
                        </div>
                    ) : footer}
                </div>
            )}
        </BreadcrumbProvider>
    );
}
