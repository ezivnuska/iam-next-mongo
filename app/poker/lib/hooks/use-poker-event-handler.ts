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
  const { showNotification, clearNotification } = useNotifications();
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

      // Winner and game_starting notifications are now PURELY VISUAL
      // The server handles the reset/restart flow automatically (fully server-driven)
      // This eliminates client-triggered API calls that were causing page refreshes

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

        // Determine onComplete callback based on notification type
        // Only player actions need callbacks now - winner/game_starting are purely visual
        let onCompleteCallback: (() => void) | undefined = undefined;

        if (shouldSignal) {
          // Player action notifications signal ready for next turn
          onCompleteCallback = () => {
            console.log('[PokerEventHandler] Action notification complete - signaling ready for next turn');
            signalReadyForNextTurn(gameId);
          };
        }
        // Winner and game_starting notifications have NO callbacks - they're purely informational
        // The server automatically handles reset/restart in a fully server-driven flow

        showNotification({
          message,
          type,
          duration,
          metadata: payload,
          onComplete: onCompleteCallback,
        });
      }
    };

    // Handler for notification cancellation
    const handleNotificationCanceled = () => {
      console.log('[PokerEventHandler] *** NOTIFICATION CANCELED - Clearing immediately ***');
      clearNotification();
    };

    // Register socket listeners
    console.log('[PokerEventHandler] Registering poker notification listeners for game:', gameId);
    socket.on(SOCKET_EVENTS.POKER_NOTIFICATION, handlePokerNotification);
    socket.on(SOCKET_EVENTS.POKER_NOTIFICATION_CANCELED, handleNotificationCanceled);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_NOTIFICATION, handlePokerNotification);
      socket.off(SOCKET_EVENTS.POKER_NOTIFICATION_CANCELED, handleNotificationCanceled);
    };
  }, [socket, gameId, user, showNotification, clearNotification, signalReadyForNextTurn, syncPotFromNotification, shouldSyncPot, clearTimerOptimistically]);
}
