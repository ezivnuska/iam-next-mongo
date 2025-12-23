// app/lib/hooks/use-responsive-square-size.ts

'use client';

import { useEffect, useState, RefObject } from 'react';

/**
 * Hook to calculate a square size based on the parent element's dimensions.
 * Uses ResizeObserver to watch for parent size changes and returns the smaller
 * of width or height to maintain a 1:1 aspect ratio.
 *
 * @param containerRef - Ref to the container element
 * @param dependencies - Array of dependencies that should trigger a recalculation
 * @returns The calculated square size in pixels
 */
export function useResponsiveSquareSize<T extends HTMLElement = HTMLElement>(
    containerRef: RefObject<T>,
    dependencies: any[] = []
): number {
    const [size, setSize] = useState<number>(0);

    useEffect(() => {
        let rafId: number | null = null;

        const updateSize = () => {
            if (!containerRef.current) return;

            const parent = containerRef.current.parentElement;
            if (!parent) return;

            // Get parent's available space
            const parentWidth = parent.clientWidth;
            const parentHeight = parent.clientHeight;

            // Get the element's position relative to viewport
            const rect = containerRef.current.getBoundingClientRect();

            // Calculate available vertical space from current position to bottom of viewport
            const availableVerticalSpace = window.innerHeight - rect.top;

            // Use the smaller of width, parent height, and available viewport space
            // This prevents the board from expanding beyond visible screen area
            const squareSize = Math.min(parentWidth, parentHeight, availableVerticalSpace);

            // Always update, even if the value seems the same
            setSize(prevSize => {
                // Force update by checking if values actually differ
                if (squareSize !== prevSize && squareSize > 0) {
                    return squareSize;
                }
                return prevSize;
            });
        };

        // Debounced update to avoid too many calls
        const debouncedUpdate = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updateSize);
        };

        // Update with multiple retries to catch layout changes
        const updateSizeWithRetries = () => {
            updateSize(); // Immediate
            requestAnimationFrame(() => {
                updateSize(); // After paint
                setTimeout(updateSize, 50); // After short delay
                setTimeout(updateSize, 150); // After longer delay
            });
        };

        // Initial size calculation with retries
        updateSizeWithRetries();

        // Create ResizeObserver to watch for parent size changes
        const parentObserver = new ResizeObserver((entries) => {
            debouncedUpdate();
        });

        // Create ResizeObserver to watch for self size changes (when constrained by maxWidth/maxHeight)
        const selfObserver = new ResizeObserver((entries) => {
            debouncedUpdate();
        });

        // Observe both parent and self
        if (containerRef.current) {
            selfObserver.observe(containerRef.current);
            if (containerRef.current.parentElement) {
                parentObserver.observe(containerRef.current.parentElement);
            }
        }

        // Listen to window resize with debounce
        const handleResize = () => {
            debouncedUpdate();
            // Also do immediate update for faster response
            updateSize();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            parentObserver.disconnect();
            selfObserver.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, dependencies);

    return size;
}
