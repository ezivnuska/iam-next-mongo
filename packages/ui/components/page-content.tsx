'use client';

import { useRef, useState, useCallback } from 'react';
import clsx from 'clsx';

interface PageContentProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    fullscreen?: boolean;
}

const ANIMATION_DURATION = 400;

export default function PageContent({ children, header, fullscreen = false }: PageContentProps) {
    const lastScrollRef = useRef(0);
    const lockedRef = useRef(false);
    const [headerVisible, setHeaderVisible] = useState(true);

    const setHeaderVisibleLocked = useCallback((visible: boolean) => {
        lockedRef.current = true;
        setHeaderVisible(visible);
        setTimeout(() => { lockedRef.current = false; }, ANIMATION_DURATION);
    }, []);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (!header) return;
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const scrollable = scrollHeight - clientHeight;
        const clamped = Math.max(0, Math.min(scrollTop, scrollable));
        const delta = clamped - lastScrollRef.current;
        lastScrollRef.current = clamped;
        if (clamped === 0) { setHeaderVisibleLocked(true); return; }
        if (lockedRef.current || scrollable < 120) return;
        if (delta > 4) setHeaderVisibleLocked(false);
        else if (delta < -4) setHeaderVisibleLocked(true);
    }, [header, setHeaderVisibleLocked]);

    return (
        <div className={clsx('@container/page flex flex-1 flex-col min-h-0 min-w-0 w-full mx-auto', {
            'max-w-content': !fullscreen,
        })}>
            {header && (
                <div
                    className='overflow-hidden transition-[max-height,opacity] duration-[400ms] ease-in-out'
                    style={{ maxHeight: headerVisible ? '200px' : '0', opacity: headerVisible ? 1 : 0 }}
                >
                    {header}
                </div>
            )}
            <div className='flex-1 overflow-y-auto min-h-0' onScroll={handleScroll}>
                {children}
            </div>
        </div>
    );
}
