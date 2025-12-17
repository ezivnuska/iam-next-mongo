// app/lib/hooks/use-horizontal-layout.ts

'use client';

import { useState, useEffect } from 'react';
import { useScreenOrientation } from '@/app/games/poker/lib/hooks/use-screen-orientation';

/**
 * Hook to determine if the UI should use horizontal layout
 * Returns true only for mobile devices in landscape orientation
 *
 * @param mobileBreakpoint - Width threshold for mobile devices (default: 768px)
 * @returns boolean - true if mobile device in landscape mode
 */
export function useHorizontalLayout(mobileBreakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const orientation = useScreenOrientation();
  const isPortrait = orientation === 'portrait';

  // Detect mobile device based on screen width
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  // Only use horizontal layout on mobile landscape
  return !isPortrait && isMobile;
}
