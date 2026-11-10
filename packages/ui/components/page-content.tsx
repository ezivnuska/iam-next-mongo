'use client';

import { useRef, useState, useCallback } from 'react';
import clsx from 'clsx';

interface PageContentProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    fullscreen?: boolean;
}

export default function PageContent({ children, header, fullscreen = false }: PageContentProps) {
    const lastScrollRef = useRef(0);
    const [headerVisible, setHeaderVisible] = useState(true);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (!header) return;
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const scrollable = scrollHeight - clientHeight;
        if (scrollable < 120) return;
        const delta = scrollTop - lastScrollRef.current;
        lastScrollRef.current = scrollTop;
        if (scrollTop === 0) setHeaderVisible(true);
        else if (delta > 4) setHeaderVisible(false);
        else if (delta < -4) setHeaderVisible(true);
    }, [header]);

    return (
        <div className={clsx('@container/page flex flex-1 flex-col min-h-0 min-w-0 w-full mx-auto', {
            'max-w-content': !fullscreen,
        })}>
            {header && (
                <div
                    className='grid transition-[grid-template-rows] duration-[933ms] ease-in-out'
                    style={{ gridTemplateRows: headerVisible ? '1fr' : '0fr' }}
                >
                    <div className={`overflow-hidden transition-transform duration-[933ms] ease-in-out ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                        {header}
                    </div>
                </div>
            )}
            <div className='flex-1 overflow-y-auto min-h-0 px-4' onScroll={handleScroll}>
                {children}
            </div>
        </div>
    );
}
