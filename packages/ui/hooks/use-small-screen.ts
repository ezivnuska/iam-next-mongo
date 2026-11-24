'use client';

import { useEffect, useState } from 'react';

export function useSmallScreen(breakpoint = 768): boolean {
    const [isSmall, setIsSmall] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );

    useEffect(() => {
        const update = () => setIsSmall(window.innerWidth < breakpoint);
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [breakpoint]);

    return isSmall;
}
