'use client';

import { useState, useEffect } from 'react';
import { useScreenOrientation } from './use-screen-orientation';

const NARROW_BREAKPOINT = 500;

export function useHorizontalLayout(mobileBreakpoint: number = 1024): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < mobileBreakpoint : true
  );
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < NARROW_BREAKPOINT : true
  );
  const orientation = useScreenOrientation();
  const isPortrait = orientation === 'portrait';

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsMobile(w < mobileBreakpoint);
      setIsNarrow(w < NARROW_BREAKPOINT);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [mobileBreakpoint]);

  // Wide screens always use sidebar. Landscape mobile uses sidebar only when
  // wide enough to avoid a cramped layout (>= 500px).
  return !isMobile || (!isPortrait && !isNarrow);
}
