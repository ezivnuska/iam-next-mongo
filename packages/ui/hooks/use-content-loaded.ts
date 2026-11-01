'use client';

import { useState, useEffect } from 'react';

export function useContentLoaded(delay: number = 100): boolean {
    const [isContentLoaded, setIsContentLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsContentLoaded(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return isContentLoaded;
}
