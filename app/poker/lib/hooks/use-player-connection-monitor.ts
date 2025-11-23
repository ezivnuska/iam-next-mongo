// app/poker/lib/hooks/use-player-connection-monitor.ts

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ConnectionMonitorConfig {
  gameId: string | null;
  isUserInGame: boolean;
  isMyTurn: boolean;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

/**
 * Monitors player connection and handles navigation away from poker page
 *
 * Features:
 * 1. Detects page navigation/close attempts
 * 2. Monitors page visibility changes
 * 3. Tracks socket connection status
 * 4. Warns user before leaving during their turn
 * 5. Handles graceful reconnection
 *
 * @example
 * ```tsx
 * usePlayerConnectionMonitor({
 *   gameId,
 *   isUserInGame,
 *   isMyTurn,
 *   onDisconnect: () => console.log('Player disconnected'),
 *   onReconnect: () => console.log('Player reconnected'),
 * });
 * ```
 */
export function usePlayerConnectionMonitor({
  gameId,
  isUserInGame,
  isMyTurn,
  onDisconnect,
  onReconnect,
}: ConnectionMonitorConfig) {
  const disconnectTimeRef = useRef<number | null>(null);
  const reconnectGracePeriod = 30000; // 30 seconds to reconnect

  // Track page visibility changes
  useEffect(() => {
    if (!isUserInGame || !gameId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User navigated away or minimized tab
        disconnectTimeRef.current = Date.now();
        onDisconnect?.();
      } else {
        // User returned to page
        const wasDisconnected = disconnectTimeRef.current !== null;

        if (wasDisconnected) {
          const disconnectDuration = Date.now() - disconnectTimeRef.current!;

          if (disconnectDuration < reconnectGracePeriod) {
            // Within grace period - user successfully reconnected
            onReconnect?.();
          }

          disconnectTimeRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUserInGame, gameId, onDisconnect, onReconnect, reconnectGracePeriod]);

  // Warn before leaving during player's turn
  useEffect(() => {
    if (!isMyTurn || !isUserInGame) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show browser warning when trying to leave during turn
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
      return ''; // Some browsers show this message
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isMyTurn, isUserInGame]);

  // Note: Heartbeat tracking removed - Socket.io provides built-in connection tracking
  // Connection status is monitored via socket 'connect' and 'disconnect' events
}

/**
 * Hook to monitor socket connection status
 */
export function useSocketConnectionMonitor(
  socket: any,
  onDisconnect?: () => void,
  onReconnect?: () => void
) {
  useEffect(() => {
    if (!socket) return;

    const handleDisconnect = () => {
      console.warn('Socket disconnected');
      onDisconnect?.();
    };

    const handleReconnect = () => {
      onReconnect?.();
    };

    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleReconnect);
    };
  }, [socket, onDisconnect, onReconnect]);
}
