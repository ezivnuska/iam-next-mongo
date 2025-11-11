// app/poker/lib/hooks/use-poker-event-handler.ts
/**
 * Centralized poker event handler that processes all poker-related socket events
 * and shows notifications immediately.
 *
 * This hook:
 * - Listens to all poker socket events
 * - Converts events into notifications
 * - Shows notifications immediately (no queue)
 * - Signals server after action notification timers complete
 * - Maintains clean separation between events and UI
 */

'use client';

import { useEffect } from 'react';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { useNotifications } from '../providers/notification-provider';
import { useGameFlowController } from './use-game-flow-controller';
import { usePotSync } from './use-pot-sync';
import { usePokerActions } from '../providers/poker-provider';
import { SOCKET_EVENTS, type PokerNotificationPayload } from '@/app/lib/socket/events';
import { formatNotificationMessage } from '../utils/notification-formatter';
import { POKER_TIMERS } from '../config/poker-constants';

export function usePokerEventHandler(gameId: string | null) {
  const { socket } = useSocket();
  const { user } = useUser();
  const { showNotification } = useNotifications();
  const { signalReadyForNextTurn } = useGameFlowController();
  const { syncPotFromNotification, shouldSyncPot } = usePotSync();
  const { clearTimerOptimistically } = usePokerActions();

  useEffect(() => {
    if (!socket || !gameId) {
      console.log('[PokerEventHandler] Effect triggered but missing dependencies:', { hasSocket: !!socket, gameId });
      return;
    }

    console.log('[PokerEventHandler] Registering listener - socket connected:', socket.connected, 'gameId:', gameId);

    const handlePokerNotification = (payload: PokerNotificationPayload) => {
      console.log('[PokerEventHandler] *** RECEIVED POKER NOTIFICATION VIA SOCKET ***:', {
        notificationType: payload.notificationType,
        playerName: payload.playerName,
        chipAmount: payload.chipAmount,
        isAI: payload.isAI,
        category: payload.category,
        timestamp: new Date().toISOString(),
      });

      // Format message using shared formatter utility
      const message = formatNotificationMessage(payload);

      // Map category to NotificationType (stage -> info for stage advancement)
      const type = payload.category === 'stage' ? 'info' : payload.category;

      // Determine notification duration based on type
      const { POKER_GAME_CONFIG } = require('../config/poker-constants');
      let duration: number;

      if (payload.notificationType === 'game_starting' && payload.countdownSeconds) {
        // Game starting with countdown (from player join)
        duration = payload.countdownSeconds * 1000;
      } else if (payload.notificationType === 'winner_determined' || payload.notificationType === 'game_tied') {
        // Winner notifications use 10 second duration
        duration = POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS; // 10 seconds
      } else {
        // Default duration for all other notifications
        duration = POKER_TIMERS.NOTIFICATION_DURATION_MS; // 5 seconds
      }

      // Determine if we need to signal server after notification completes
      const playerActions = ['player_bet', 'player_raise', 'player_call', 'player_check', 'player_fold', 'player_all_in'];
      const isPlayerAction = playerActions.includes(payload.notificationType);
      // IMPORTANT: Only the acting player should signal ready, not spectators/other players
      // Otherwise multiple clients would signal ready causing multiple turn advancements
      const isOwnAction = payload.playerId === user?.id;
      const shouldSignal = isPlayerAction && !payload.isAI && isOwnAction; // Only acting player signals for human actions

      // Clear timer optimistically for ANY player action (including AI)
      if (isPlayerAction) {
        console.log('[PokerEventHandler] Action notification received - clearing timer optimistically');
        clearTimerOptimistically();
      }

      if (isOwnAction && isPlayerAction) {
        // This is the acting user receiving their own action notification via socket
        // Don't show the notification (they already saw it optimistically)
        // But still sync pot and signal ready after the delay
        console.log('[PokerEventHandler] Received own action notification - skipping display but syncing pot and will signal ready');

        // Sync pot from socket event to correct any discrepancies with optimistic update
        if (shouldSyncPot(payload.notificationType)) {
          console.log('[PokerEventHandler] Syncing pot from own action socket event');
          syncPotFromNotification(payload);
        }

        if (shouldSignal) {
          // Set up timer to signal ready after notification duration
          setTimeout(() => {
            console.log('[PokerEventHandler] Own action timer complete - signaling ready for next turn');
            signalReadyForNextTurn(gameId);
          }, duration);
        }
      } else {
        // This is for another player's action or a non-action event
        // Show the notification normally
        console.log('[PokerEventHandler] *** SHOWING NOTIFICATION IMMEDIATELY ***: message=', message, 'duration=', duration);

        showNotification({
          message,
          type,
          duration,
          metadata: payload,
          onComplete: shouldSignal ? () => {
            console.log('[PokerEventHandler] Action notification complete - signaling ready for next turn');
            signalReadyForNextTurn(gameId);
          } : undefined,
        });
      }
    };

    // Register socket listener
    console.log('[PokerEventHandler] Registering poker notification listener for game:', gameId);
    socket.on(SOCKET_EVENTS.POKER_NOTIFICATION, handlePokerNotification);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_NOTIFICATION, handlePokerNotification);
    };
  }, [socket, gameId, user, showNotification, signalReadyForNextTurn, syncPotFromNotification, shouldSyncPot, clearTimerOptimistically]);
}
