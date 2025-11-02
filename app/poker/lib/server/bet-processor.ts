// app/lib/server/poker/bet-processor.ts

import type { Player, Bet } from '@/app/poker/lib/definitions/poker';
import { initializeBets } from '@/app/poker/lib/utils/betting-helpers';

/**
 * Initialize player bets array if not properly set
 */
export function ensurePlayerBetsInitialized(game: any): void {
  if (game.playerBets.length !== game.players.length) {
    game.playerBets = initializeBets(game.players.length);
  }
}

/**
 * Process a bet by removing chips from player and adding to pot
 */
export function processBetTransaction(
  player: Player,
  chipCount: number
): { player: Player; chipsToAdd: Bet } {
  const chipsToRemove = player.chips.splice(0, chipCount);

  return {
    player,
    chipsToAdd: {
      player: player.username,
      chips: chipsToRemove,
    },
  };
}

/**
 * Update game state after a bet is placed
 */
export function updateGameAfterBet(
  game: any,
  playerIndex: number,
  chipCount: number,
  updatedPlayer: Player,
  betToAdd: Bet
): void {
  // Only add chips to pot if chipCount > 0 (skip for check action)
  if (chipCount > 0) {
    game.pot.push(betToAdd);
    game.markModified('pot');
  }

  // Update player's total bet for this round
  game.playerBets[playerIndex] += chipCount;
  game.markModified('playerBets');

  // Update player in game (even if chips didn't change, mark as modified for Mongoose)
  game.players[playerIndex] = updatedPlayer;
  game.markModified('players');

  // Move to next player
  const nextIndex = (playerIndex + 1) % game.players.length;
  game.currentPlayerIndex = nextIndex;

  // Mark as modified for Mongoose to track the change
  game.markModified('currentPlayerIndex');
}

/**
 * Calculate next player index
 */
export function getNextPlayerIndex(currentIndex: number, totalPlayers: number): number {
  return (currentIndex + 1) % totalPlayers;
}
