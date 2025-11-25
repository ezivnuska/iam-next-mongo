// app/poker/lib/hooks/use-screen-orientation.ts

'use client';

import { useState, useEffect } from 'react';

export type ScreenOrientation = 'portrait' | 'landscape';

/**
 * Custom hook to detect screen orientation
 * Returns 'portrait' when height > width, 'landscape' otherwise
 * Updates automatically when window is resized
 */
export function useScreenOrientation(): ScreenOrientation {
  const [orientation, setOrientation] = useState<ScreenOrientation>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      setOrientation(newOrientation);
    };

    // Set initial orientation
    updateOrientation();

    // Listen for resize events
    window.addEventListener('resize', updateOrientation);

    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', updateOrientation);
  }, []);

  return orientation;
}
