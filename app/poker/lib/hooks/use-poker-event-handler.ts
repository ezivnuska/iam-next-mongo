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
import { SOCKET_EVENTS, type PokerNotificationPayload, type PokerActionTimerStartedPayload } from '@/app/lib/socket/events';
import { formatNotificationMessage } from '../utils/notification-formatter';
import { POKER_TIMERS } from '../config/poker-constants';

export function usePokerEventHandler(gameId: string | null) {
  const { socket } = useSocket();
  const { user } = useUser();
  const { showNotification, clearNotification, resetNotifications } = useNotifications();
  const { clearAllPlayerNotifications, clearPlayerNotification } = usePlayerNotifications();
  const { syncPotFromNotification, shouldSyncPot } = usePotSync();
  const { clearTimerOptimistically, playSound, setCommunalCards, setPlayers } = usePokerActions();

  useEffect(() => {
    if (!socket || !gameId) {
      return;
    }


    const handlePokerNotification = (payload: PokerNotificationPayload) => {
      // Format message using shared formatter utility
      const message = formatNotificationMessage(payload);

      // Map category to NotificationType (stage -> info for stage advancement)
      const type = payload.category === 'stage' ? 'info' : payload.category;

      // Determine notification duration based on type
      const { POKER_GAME_CONFIG } = require('../config/poker-constants');
      let duration: number;

      // Check if this is a player action notification
      const playerActions = ['player_bet', 'player_raise', 'player_call', 'player_check', 'player_fold', 'player_all_in', 'player_thinking'];
      const isPlayerAction = playerActions.includes(payload.notificationType);

      // Check if this is a pre-game notification (blinds, cards dealt)
      const isPreGameNotification = payload.notificationType === 'blind_posted' || payload.notificationType === 'cards_dealt';

      if (payload.notificationType === 'game_starting' && payload.countdownSeconds) {
        // Game starting with countdown (from player join)
        duration = payload.countdownSeconds * 1000;
      } else if (payload.notificationType === 'winner_determined' || payload.notificationType === 'game_tied') {
        // Winner notifications use 10 second duration
        duration = POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS; // 10 seconds
      } else if (payload.notificationType === 'player_joined') {
        // Player joined notifications use 2 second duration
        duration = POKER_GAME_CONFIG.PLAYER_JOINED_NOTIFICATION_DURATION_MS; // 2 seconds
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

      // Check if this is the user's own action (for logging purposes)
      const isOwnAction = payload.playerId === user?.id;

      // Clear timer optimistically for ANY player action (including AI)
      if (isPlayerAction) {
        clearTimerOptimistically();
      }

      // Always show action notifications to all players (including the acting player)
      // The acting player sees optimistic notifications immediately when they click
      // The socket notification confirms the action was processed by the server
      if (payload.timerTriggered && isOwnAction) {
      } else if (isOwnAction && isPlayerAction) {
      } else {
      }

      // Sync pot from socket event to ensure state consistency
      if (shouldSyncPot(payload.notificationType)) {
        syncPotFromNotification(payload);
      }

      // Clear all player notifications before showing ANY dealing notifications
      // This ensures player action notifications disappear before dealing (hole cards, flop, turn, river)
      const isDealingNotification = payload.notificationType === 'cards_dealt';
      if (isDealingNotification) {
        clearAllPlayerNotifications();
      }

      // Handle game_starting notification - reset UI state for new round
      if (payload.notificationType === 'game_starting' && payload.stage === 0) {

        // Reset notification queue to clear any stale notifications from previous game
        // This must be done BEFORE showing the game_starting notification
        resetNotifications();

        // NOTE: pot and playerBets are NOT synced here to avoid race condition.
        // They will be properly synced via blind notifications and state updates from step flow.
        setCommunalCards([]); // Clear communal cards
        // Winner state will be reset through server state updates
        // Clear player hands by mapping current players to empty hands
        setPlayers((prev: any[]) => prev.map((p: any) => ({ ...p, hand: [], folded: false, isAllIn: false })));
      }

      // Route to appropriate notification display
      const isBlindNotification = payload.notificationType === 'blind_posted';
      const isPlayerJoinedNotification = payload.notificationType === 'player_joined';
      const isWinnerNotification = payload.notificationType === 'winner_determined' || payload.notificationType === 'game_tied';

      // Play appropriate sound for player actions
      if (isPlayerAction || isBlindNotification) {
        if (isBlindNotification) {
          // Blinds are automatic - always play sound regardless of who posted
          playSound('chips');
        } else if (!isOwnAction || payload.timerTriggered) {
          // For player actions, skip sound if it's own action (already played optimistically)
          // unless it's timer-triggered
          if (payload.notificationType === 'player_fold') {
            playSound('fold');
          } else if (payload.notificationType === 'player_check') {
            playSound('check');
          } else if (payload.notificationType === 'player_call' ||
                     payload.notificationType === 'player_bet' ||
                     payload.notificationType === 'player_raise' ||
                     payload.notificationType === 'player_all_in') {
            playSound('chips'); // All betting actions = chips sound
          }
        }
      }

      // Play winner sound
      if (isWinnerNotification) {
        playSound('winner');
      }

      // All notifications now go to central display with 2-second auto-clear for player actions

      const onComplete = isWinnerNotification ? () => {
        clearAllPlayerNotifications();
      } : undefined;

      showNotification({
        message,
        type,
        duration,
        metadata: payload,
        onComplete,
      });
    };

    // Handler for notification cancellation
    const handleNotificationCanceled = () => {
      clearNotification();
    };

    // Handler for timer started - clear the player's previous action notification
    // This ensures notifications persist until the player's next turn
    const handleTimerStarted = (payload: PokerActionTimerStartedPayload) => {
      if (payload.targetPlayerId) {
        clearPlayerNotification(payload.targetPlayerId);
      }
    };

    // Register socket listeners
    socket.on(SOCKET_EVENTS.POKER_NOTIFICATION, handlePokerNotification);
    socket.on(SOCKET_EVENTS.POKER_NOTIFICATION_CANCELED, handleNotificationCanceled);
    socket.on(SOCKET_EVENTS.POKER_ACTION_TIMER_STARTED, handleTimerStarted);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_NOTIFICATION, handlePokerNotification);
      socket.off(SOCKET_EVENTS.POKER_NOTIFICATION_CANCELED, handleNotificationCanceled);
      socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_STARTED, handleTimerStarted);
    };
  }, [socket, gameId, user, showNotification, clearNotification, resetNotifications, clearPlayerNotification, syncPotFromNotification, shouldSyncPot, clearTimerOptimistically, clearAllPlayerNotifications, playSound, setCommunalCards, setPlayers]);
}
