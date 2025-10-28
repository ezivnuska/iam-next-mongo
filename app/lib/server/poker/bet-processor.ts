// app/lib/server/poker/bet-processor.ts

import type { Player, Bet } from '@/app/lib/definitions/poker';
import { initializeBets } from '@/app/lib/utils/betting-helpers';

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
  // Add chips to pot
  game.pot.push(betToAdd);

  // Update player's total bet for this round
  game.playerBets[playerIndex] += chipCount;

  // Update player in game
  game.players[playerIndex] = updatedPlayer;

  // Move to next player
  const nextIndex = (playerIndex + 1) % game.players.length;
  game.currentPlayerIndex = nextIndex;
}

/**
 * Calculate next player index
 */
export function getNextPlayerIndex(currentIndex: number, totalPlayers: number): number {
  return (currentIndex + 1) % totalPlayers;
}
