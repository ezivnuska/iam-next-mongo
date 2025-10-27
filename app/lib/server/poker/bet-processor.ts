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
  console.log('[Bet Processor] Processing bet for player:', player.username);
  console.log('[Bet Processor] chipCount parameter:', chipCount);
  console.log('[Bet Processor] Player chips before splice:', player.chips.length, 'chips');

  const chipsToRemove = player.chips.splice(0, chipCount);

  console.log('[Bet Processor] Chips removed from player:', chipsToRemove.length, 'chips');
  console.log('[Bet Processor] Chip values:', chipsToRemove.map(c => c.value));
  console.log('[Bet Processor] Player chips after splice:', player.chips.length, 'chips');

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
  console.log('[Update Game] Adding bet to pot:', {
    player: betToAdd.player,
    chipsInBet: betToAdd.chips.length,
    chipValues: betToAdd.chips.map(c => c.value),
    currentPotSize: game.pot.length
  });

  // Add chips to pot
  game.pot.push(betToAdd);

  console.log('[Update Game] Pot after adding bet:', game.pot.length, 'bets');
  console.log('[Update Game] Total chips in pot:', game.pot.reduce((sum: number, bet: Bet) => sum + bet.chips.length, 0));

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
