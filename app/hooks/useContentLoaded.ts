// app/hooks/useContentLoaded.ts

import { useState, useEffect } from 'react';

/**
 * Custom hook to manage content loading state with a short delay
 * to prevent flash of loading state for fast-loading content.
 *
 * @param delay - Delay in milliseconds before marking content as loaded (default: 100ms)
 * @returns boolean indicating if content should be considered loaded
 */
export function useContentLoaded(delay: number = 100): boolean {
    const [isContentLoaded, setIsContentLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsContentLoaded(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return isContentLoaded;
}
