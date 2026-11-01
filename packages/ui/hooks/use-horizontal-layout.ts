'use client';

import { useState, useEffect } from 'react';
import { useScreenOrientation } from './use-screen-orientation';

export function useHorizontalLayout(mobileBreakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  const orientation = useScreenOrientation();
  const isPortrait = orientation === 'portrait';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  return !isPortrait && isMobile;
}
