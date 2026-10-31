// app/lib/hooks/use-screen-orientation.ts

'use client';

import { useState, useEffect } from 'react';

export type ScreenOrientation = 'portrait' | 'landscape';

export function useScreenOrientation(): ScreenOrientation {
  const [orientation, setOrientation] = useState<ScreenOrientation>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      setOrientation(newOrientation);
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
}
