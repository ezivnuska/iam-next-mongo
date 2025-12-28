// app/lib/hooks/use-carousel.ts

'use client';

import { useState, useCallback, useEffect } from 'react';

export interface UseCarouselOptions<T> {
  items: T[];
  initialIndex?: number;
  onIndexChange?: (index: number, item: T) => void;
  onClose?: () => void;
  enabled?: boolean;
}

export interface UseCarouselReturn<T> {
  currentIndex: number;
  currentItem: T | undefined;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  positionText: string;
  totalItems: number;
}

const MIN_SWIPE_DISTANCE = 50;

export function useCarousel<T>({
  items,
  initialIndex = 0,
  onIndexChange,
  onClose,
  enabled = true,
}: UseCarouselOptions<T>): UseCarouselReturn<T> {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const canGoNext = currentIndex < items.length - 1;
  const canGoPrevious = currentIndex > 0;
  const currentItem = items[currentIndex];

  // Sync currentIndex with initialIndex when it changes
  useEffect(() => {
    if (enabled && initialIndex >= 0 && initialIndex < items.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, enabled, items.length]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex(prev => {
        const newIndex = prev + 1;
        if (onIndexChange) {
          onIndexChange(newIndex, items[newIndex]);
        }
        return newIndex;
      });
    }
  }, [canGoNext, items, onIndexChange]);

  const goToPrevious = useCallback(() => {
    if (canGoPrevious) {
      setCurrentIndex(prev => {
        const newIndex = prev - 1;
        if (onIndexChange) {
          onIndexChange(newIndex, items[newIndex]);
        }
        return newIndex;
      });
    }
  }, [canGoPrevious, items, onIndexChange]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
      if (onIndexChange) {
        onIndexChange(index, items[index]);
      }
    }
  }, [items, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, goToNext, goToPrevious, onClose]);

  // Touch handlers for swipe gestures
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  }, [touchStart, touchEnd, goToNext, goToPrevious]);

  const positionText = `${currentIndex + 1} / ${items.length}`;

  return {
    currentIndex,
    currentItem,
    goToNext,
    goToPrevious,
    goToIndex,
    canGoNext,
    canGoPrevious,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    positionText,
    totalItems: items.length,
  };
}
