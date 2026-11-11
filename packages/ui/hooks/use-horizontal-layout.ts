'use client';

import { useState, useEffect } from 'react';
import { useScreenOrientation } from './use-screen-orientation';

const NARROW_BREAKPOINT = 500;

export function useHorizontalLayout(mobileBreakpoint: number = 1024): boolean | null {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [isNarrow, setIsNarrow] = useState(true);
  const orientation = useScreenOrientation();

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsMobile(w < mobileBreakpoint);
      setIsNarrow(w < NARROW_BREAKPOINT);
    };
    update();
    setMounted(true);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [mobileBreakpoint]);

  if (!mounted) return null;

  const isPortrait = orientation === 'portrait';
  // Wide screens always use sidebar. Landscape mobile uses sidebar only when
  // wide enough to avoid a cramped layout (>= 500px).
  return !isMobile || (!isPortrait && !isNarrow);
}
