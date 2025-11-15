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
import { usePlayerNotifications } from '../providers/player-notification-provider';
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
  const { showPlayerNotification, clearAllPlayerNotifications } = usePlayerNotifications();
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

      // Check if this is a player action notification
      const playerActions = ['player_bet', 'player_raise', 'player_call', 'player_check', 'player_fold', 'player_all_in'];
      const isPlayerAction = playerActions.includes(payload.notificationType);

      // Check if this is a pre-game notification (blinds, cards dealt)
      const isPreGameNotification = payload.notificationType === 'blind_posted' || payload.notificationType === 'cards_dealt';

      if (payload.notificationType === 'game_starting' && payload.countdownSeconds) {
        // Game starting with countdown (from player join)
        duration = payload.countdownSeconds * 1000;
      } else if (payload.notificationType === 'winner_determined' || payload.notificationType === 'game_tied') {
        // Winner notifications use 10 second duration
        duration = POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS; // 10 seconds
      } else if (isPlayerAction || isPreGameNotification) {
        // Player action and pre-game notifications use 2 second duration
        duration = POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS; // 2 seconds
      } else {
        // Default duration for all other notifications (stage changes, etc.)
        duration = POKER_TIMERS.NOTIFICATION_DURATION_MS; // 4 seconds
      }

      // Determine if we need to signal server after notification completes
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
        // Skip display - notification already shown optimistically when action was taken
        console.log('[PokerEventHandler] Received own action notification - skipping display (already shown optimistically) but syncing pot and will signal ready');

        // Sync pot from socket event to correct any discrepancies with optimistic update
        if (shouldSyncPot(payload.notificationType)) {
          console.log('[PokerEventHandler] Syncing pot from own action socket event');
          syncPotFromNotification(payload);
        }

        // Note: The optimistic notification display (shown when action was taken) handles signaling ready
        // So we don't need to set up a timer here
      } else {
        // This is for another player's action or a non-action event
        console.log('[PokerEventHandler] *** SHOWING NOTIFICATION ***: message=', message, 'duration=', duration);

        // Clear all player notifications before showing ANY dealing notifications
        // This ensures player action notifications disappear before dealing (hole cards, flop, turn, river)
        const isDealingNotification = payload.notificationType === 'cards_dealt';
        if (isDealingNotification) {
          console.log('[PokerEventHandler] Clearing all player notifications before showing dealing notification');
          clearAllPlayerNotifications();
        }

        // Sync pot for blind notifications and other player actions
        if (shouldSyncPot(payload.notificationType)) {
          console.log('[PokerEventHandler] Syncing pot from notification:', payload.notificationType);
          syncPotFromNotification(payload);
        }

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

        // Route player actions and blinds to player-specific notifications
        const isBlindNotification = payload.notificationType === 'blind_posted';

        if ((isPlayerAction || isBlindNotification) && payload.playerId) {
          console.log('[PokerEventHandler] Routing to player notification for player:', payload.playerId);
          showPlayerNotification({
            playerId: payload.playerId,
            message,
            timestamp: Date.now(),
            onComplete: onCompleteCallback,
          });
        } else {
          // Non-player-action events (winner, game_starting, cards dealt, etc.) go to central notification
          showNotification({
            message,
            type,
            duration,
            metadata: payload,
            onComplete: onCompleteCallback,
          });
        }
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
  }, [socket, gameId, user, showNotification, showPlayerNotification, clearNotification, signalReadyForNextTurn, syncPotFromNotification, shouldSyncPot, clearTimerOptimistically]);
}
