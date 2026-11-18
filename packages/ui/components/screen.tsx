'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
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
    footer?: React.ReactNode;
    showLoading?: boolean;
    brandHref?: string;
    headerReady?: boolean;
}

export default function Screen({
    children,
    userControls,
    nav,
    extras,
    footer,
    showLoading = true,
    brandHref,
    headerReady = true,
}: ScreenProps) {
    const horizontalLayout = useHorizontalLayout();
    const isContentLoaded = useContentLoaded();
    const loggedIn = !!userControls;
    const navRef = useRef<HTMLElement>(null);
    const footerRef = useRef<HTMLDivElement>(null);
    const [headerVisible, setHeaderVisible] = useState(false);

    const isLandscape = horizontalLayout === true;
    const isPortrait = horizontalLayout === false;

    useEffect(() => {
        if (isPortrait) {
            const raf = requestAnimationFrame(() => setHeaderVisible(true));
            return () => cancelAnimationFrame(raf);
        }
        setHeaderVisible(false);
    }, [isPortrait]);

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
    }, [isLandscape]);

    useEffect(() => {
        if (!isPortrait || !footer) {
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

    const content = showLoading && !isContentLoaded
        ? <LoadingSpinner />
        : <Suspense fallback={null}>{children}</Suspense>;

    return (
        <BreadcrumbProvider>
            {extras}
            {isLandscape && (
                <aside
                    style={{ width: 'clamp(100px, 16vw, 200px)', paddingTop: 'clamp(8px, 2vw, 16px)', paddingBottom: 'clamp(12px, 3vw, 24px)' }}
                    className={clsx(
                        'fixed left-0 top-0 h-dvh flex flex-col items-center px-2 bg-gray-100 z-10',
                        { 'justify-between': loggedIn || !!nav },
                    )}
                >
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
            )}
            {isPortrait && (
                <header ref={navRef} className={clsx('sticky top-0 z-10 bg-gray-100 border-b border-gray-200 transition-opacity duration-300', headerVisible && headerReady ? 'opacity-100' : 'opacity-0')}>
                    <div className='flex flex-row items-center justify-between py-2 gap-4 px-4 max-w-[900px] mx-auto w-full'>
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
            )}
            <main
                style={{
                    ...(isLandscape ? { marginLeft: 'clamp(100px, 16vw, 200px)', marginRight: 'clamp(100px, 16vw, 200px)' } : {}),
                    ...(isPortrait && footer ? { paddingBottom: 'var(--footer-height)' } : {}),
                }}
                className={clsx(
                    '@container/main flex flex-col flex-1 min-h-0 overflow-x-hidden bg-white max-w-[900px]',
                    isPortrait && 'mx-auto w-full',
                    (isLandscape || isPortrait) && 'transition-opacity duration-300',
                    isLandscape && (headerReady ? 'opacity-100' : 'opacity-0'),
                    isPortrait && (headerVisible && headerReady ? 'opacity-100' : 'opacity-0'),
                )}
            >
                {content}
            </main>
            {((footer && isPortrait) || isLandscape) && (
                <div
                    ref={footerRef}
                    style={isLandscape ? { width: 'clamp(100px, 16vw, 200px)' } : undefined}
                    className={clsx(
                        '@container fixed z-10 bg-gray-100',
                        isPortrait ? 'bottom-0 left-0 right-0 border-t border-gray-200' : 'right-0 top-0 h-dvh',
                    )}
                >
                    {footer}
                </div>
            )}
        </BreadcrumbProvider>
    );
}
