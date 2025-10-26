// app/ui/countdown.tsx

'use client';

import { useState, useEffect, useRef } from 'react';

interface CountdownProps {
  label: string;
  startTime: string;      // ISO timestamp when timer started
  duration: number;       // Duration in seconds
  className?: string;
  isPaused?: boolean;
  onPauseToggle?: () => void;
  showControls?: boolean;
  onComplete?: () => void; // Callback when timer reaches 0
}

export default function Countdown({
  label,
  startTime,
  duration,
  className = '',
  isPaused = false,
  onPauseToggle,
  showControls = false,
  onComplete,
}: CountdownProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const hasCompletedRef = useRef(false);

  // Reset hasCompletedRef when startTime changes (new timer started)
  useEffect(() => {
    hasCompletedRef.current = false;
  }, [startTime]);

  useEffect(() => {
    if (isPaused) return;

    const calculateRemaining = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = (now - start) / 1000; // Convert to seconds
      const remaining = Math.max(0, Math.ceil(duration - elapsed));
      setRemainingSeconds(remaining);

      // Check if timer has expired (elapsed >= duration)
      if (elapsed >= duration && !hasCompletedRef.current && onComplete) {
        // Timer expired - trigger callback once
        hasCompletedRef.current = true;
        console.log('[Countdown] Timer expired, executing callback');
        onComplete();
      }
    };

    // Calculate immediately
    calculateRemaining();

    // Update every second
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [startTime, duration, isPaused, onComplete]);

  return (
    <div className={`p-2 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-center gap-2 ${className}`}>
      <span className="text-sm font-semibold">{label} in {remainingSeconds}s...</span>
      {showControls && onPauseToggle && (
        <button
          onClick={onPauseToggle}
          className="px-2 py-1 text-xs bg-yellow-200 hover:bg-yellow-300 rounded border border-yellow-400"
        >
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
      )}
    </div>
  );
}
