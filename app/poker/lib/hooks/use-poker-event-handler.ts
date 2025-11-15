// app/poker/lib/hooks/use-poker-event-handler.ts
/**
 * Centralized poker event handler that processes all poker-related socket events
 * and shows notifications immediately.
 *
 * This hook:
 * - Listens to all poker socket events
 * - Converts events into notifications
 * - Shows notifications immediately (no queue)
 * - Turn advancement is purely server-driven (no client signaling)
 * - Maintains clean separation between events and UI
 */

'use client';

import { useEffect } from 'react';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { useNotifications } from '../providers/notification-provider';
import { usePlayerNotifications } from '../providers/player-notification-provider';
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
  const { syncPotFromNotification, shouldSyncPot } = usePotSync();
  const { clearTimerOptimistically, playSound, setCommunalCards, setPlayers, setWinner } = usePokerActions();

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

      // Winner and game_starting notifications are now PURELY VISUAL
      // The server handles the reset/restart flow automatically (fully server-driven)
      // This eliminates client-triggered API calls that were causing page refreshes
      // Turn advancement is also fully server-driven - no client signaling needed

      // Check if this is the user's own action (for optimistic notification handling)
      const isOwnAction = payload.playerId === user?.id;

      // Clear timer optimistically for ANY player action (including AI)
      if (isPlayerAction) {
        console.log('[PokerEventHandler] Action notification received - clearing timer optimistically');
        clearTimerOptimistically();
      }

      if (isOwnAction && isPlayerAction && !payload.timerTriggered) {
        // This is the acting user receiving their own action notification via socket
        // Skip display ONLY if it's not timer-triggered (optimistic notification already shown)
        console.log('[PokerEventHandler] Received own action notification - skipping display (already shown optimistically) but syncing pot', { timerTriggered: payload.timerTriggered });

        // Sync pot from socket event to correct any discrepancies with optimistic update
        if (shouldSyncPot(payload.notificationType)) {
          console.log('[PokerEventHandler] Syncing pot from own action socket event');
          syncPotFromNotification(payload);
        }

        // Note: Turn advancement is handled server-side with automatic delay
      } else {
        // This is for another player's action, a timer-triggered own action, or a non-action event
        if (payload.timerTriggered && isOwnAction) {
          console.log('[PokerEventHandler] *** SHOWING TIMER-TRIGGERED OWN ACTION NOTIFICATION ***: message=', message, 'duration=', duration);
        } else {
          console.log('[PokerEventHandler] *** SHOWING NOTIFICATION ***: message=', message, 'duration=', duration);
        }

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

        // Handle game_starting notification with reset data (avoid full state update)
        if (payload.notificationType === 'game_starting' && payload.stage === 0) {
          console.log('[PokerEventHandler] Processing game reset from game_starting notification');
          syncPotFromNotification(payload); // Clear pot and playerBets
          setCommunalCards([]); // Clear communal cards
          setWinner(undefined); // Clear winner
          // Clear player hands by mapping current players to empty hands
          setPlayers((prev: any[]) => prev.map((p: any) => ({ ...p, hand: [], folded: false, isAllIn: false })));
        }

        // Route to appropriate notification display
        const isBlindNotification = payload.notificationType === 'blind_posted';
        const isWinnerNotification = payload.notificationType === 'winner_determined' || payload.notificationType === 'game_tied';

        if ((isPlayerAction || isBlindNotification) && payload.playerId) {
          // Player actions and blinds: Show on player card
          console.log('[PokerEventHandler] Showing player notification for:', payload.playerId);

          showPlayerNotification({
            playerId: payload.playerId,
            message,
            timestamp: Date.now(),
            isBlind: isBlindNotification,
          }, playSound);
        } else {
          // Winner, game_starting, cards dealt: Show as central notification
          const onComplete = isWinnerNotification ? () => {
            console.log('[PokerEventHandler] Winner notification complete - clearing player action notifications');
            clearAllPlayerNotifications();
          } : undefined;

          showNotification({
            message,
            type,
            duration,
            metadata: payload,
            onComplete,
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
  }, [socket, gameId, user, showNotification, showPlayerNotification, clearNotification, syncPotFromNotification, shouldSyncPot, clearTimerOptimistically, clearAllPlayerNotifications, playSound, setCommunalCards, setPlayers, setWinner]);
}
