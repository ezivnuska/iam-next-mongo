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

    case 'player_thinking':
      return `${payload.playerName} thinking...`;

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
      return 'Game starting!';

    case 'blind_posted':
      // Blind notifications show on player card, so no need to include player name
      if (payload.blindType === 'small') {
        return payload.chipAmount
          ? `${payload.playerName} posted small blind ($${payload.chipAmount})`
          : `${payload.playerName} posted small blind`;
      } else {
        return payload.chipAmount
          ? `${payload.playerName} posted big blind ($${payload.chipAmount})`
          : `${payload.playerName} posted big blind`;
      }

    case 'cards_dealt':
      // Stage name indicates which cards are being dealt
      if (payload.stageName === 'FLOP') {
        return 'Dealing the flop...';
      } else if (payload.stageName === 'TURN') {
        return 'Dealing the turn...';
      } else if (payload.stageName === 'RIVER') {
        return 'Dealing the river...';
      } else {
        // Default: hole cards (preflop)
        return 'Dealing hole cards...';
      }

    case 'player_joined':
      return `${payload.playerName} joined`;

    default:
      console.warn('[NotificationFormatter] Unknown notification type:', payload.notificationType);
      return 'Game event';
  }
}
