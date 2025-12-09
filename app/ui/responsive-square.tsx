// app/ui/responsive-square.tsx
'use client';

import { useEffect, useRef, useState, ReactNode } from 'react';

interface ResponsiveSquareProps {
  children: ReactNode;
  className?: string;
}

/**
 * A square container that automatically sizes itself to fit within its parent,
 * using the smaller of the available width or height to maintain a 1:1 aspect ratio.
 *
 * Usage:
 * ```tsx
 * <div style={{ width: '500px', height: '300px' }}>
 *   <ResponsiveSquare>
 *     <YourContent />
 *   </ResponsiveSquare>
 * </div>
 * ```
 * This will create a 300x300px square (limited by height)
 */
export default function ResponsiveSquare({ children, className = '' }: ResponsiveSquareProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<number>(0);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;

      const parent = containerRef.current.parentElement;
      if (!parent) return;

      // Get parent's available space
      const parentWidth = parent.clientWidth;
      const parentHeight = parent.clientHeight;

      // Use the smaller dimension to ensure the square fits
      const squareSize = Math.min(parentWidth, parentHeight);

      setSize(squareSize);
    };

    // Delayed update for orientation changes (parent dimensions may not be updated immediately)
    const updateSizeDelayed = () => {
      requestAnimationFrame(() => {
        setTimeout(updateSize, 100);
      });
    };

    // Initial size calculation
    updateSize();

    // Create ResizeObserver to watch for parent size changes
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    // Observe the parent element
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    // Listen to window resize
    window.addEventListener('resize', updateSize);

    // Listen to orientation changes (for mobile devices)
    window.addEventListener('orientationchange', updateSizeDelayed);

    // Modern orientation change listener (if supported)
    let orientationListener: (() => void) | null = null;
    if (window.screen?.orientation) {
      orientationListener = () => updateSizeDelayed();
      window.screen.orientation.addEventListener('change', orientationListener);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSizeDelayed);
      if (orientationListener && window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', orientationListener);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`${className} flex items-stretch`}
      style={{
        width: size > 0 ? `${size}px` : '100%',
        height: size > 0 ? `${size}px` : '100%',
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    >
      {children}
    </div>
  );
}
