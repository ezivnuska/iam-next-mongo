// app/poker/lib/utils/notification-formatter.ts
/**
 * Shared utility for formatting poker notification messages
 * Eliminates duplicate message formatting logic across client hooks
 */

import type { PokerNotificationPayload } from '@/app/lib/socket/events';

/**
 * Format a notification payload into a displayable message string
 */
export function formatNotificationMessage(payload: PokerNotificationPayload): string {
  console.log('[NotificationFormatter] Formatting notification:', {
    notificationType: payload.notificationType,
    category: payload.category,
    countdownSeconds: payload.countdownSeconds,
    playerName: payload.playerName,
    chipAmount: payload.chipAmount,
  });

  switch (payload.notificationType) {
    case 'player_bet':
      return payload.chipAmount === 0
        ? `${payload.playerName} checked`
        : `${payload.playerName} bet $${payload.chipAmount}`;

    case 'player_raise':
      return `${payload.playerName} raised to $${payload.chipAmount}`;

    case 'player_call':
      return `${payload.playerName} called`;

    case 'player_check':
      return `${payload.playerName} checked`;

    case 'player_fold':
      return `${payload.playerName} folded`;

    case 'player_all_in':
      return `${payload.playerName} went all-in!`;

    case 'winner_determined':
      if (payload.handRank) {
        return `${payload.winnerName} wins with ${payload.handRank}!`;
      }
      return `${payload.winnerName} wins!`;

    case 'game_tied':
      return payload.tiedPlayers
        ? `It's a tie! ${payload.tiedPlayers.join(', ')}`
        : `It's a tie!`;

    case 'stage_advanced':
      return payload.stageName || `Stage ${payload.stage}`;

    case 'game_starting':
      // If countdownSeconds is provided, show countdown (during player join)
      // Otherwise, show "Game starting!" (when game actually locks)
      return 'Game starting!';
    //   return payload.countdownSeconds ? 'Shuffling...' : 'Game starting!';

    case 'blind_posted':
      return payload.blindType === 'small'
        ? `${payload.playerName} posted small blind`
        : `${payload.playerName} posted big blind`;

    case 'cards_dealt':
      return 'Cards dealt';

    default:
      console.warn('[NotificationFormatter] Unknown notification type:', payload.notificationType);
      return 'Game event';
  }
}
