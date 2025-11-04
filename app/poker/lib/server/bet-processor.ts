// app/lib/server/poker/bet-processor.ts

import type { Player, Bet, Chip } from '@/app/poker/lib/definitions/poker';
import { initializeBets } from '@/app/poker/lib/utils/betting-helpers';
import { getPlayerChipCount, shouldGoAllIn, getMaxBetAmount } from '@/app/poker/lib/utils/side-pot-calculator';
import { getChipTotal } from '@/app/poker/lib/utils/poker';

/**
 * Remove chips from player's chip array by total value
 * Handles chips with different denominations (e.g., chips worth 1, 10, 100)
 *
 * @param chips - Array of chip objects to remove from
 * @param targetValue - Total value of chips to remove
 * @returns Array of removed chip objects
 */
function removeChipsByValue(chips: Chip[], targetValue: number): Chip[] {
  const removed: Chip[] = [];
  let remainingValue = targetValue;

  // Remove chips from the beginning until we've removed enough value
  while (remainingValue > 0 && chips.length > 0) {
    const chip = chips.shift()!; // Remove first chip
    removed.push(chip);
    remainingValue -= chip.value;
  }

  // Sanity check: we should have removed exactly the target value
  const actualRemoved = getChipTotal(removed);
  if (actualRemoved !== targetValue) {
    console.warn(`[removeChipsByValue] Warning: Removed ${actualRemoved} chips but target was ${targetValue}`);
  }

  return removed;
}

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
 * Handles all-in scenarios automatically
 */
export function processBetTransaction(
  player: Player,
  chipCount: number
): { player: Player; chipsToAdd: Bet; actualChipCount: number; wentAllIn: boolean } {
  const availableChips = getPlayerChipCount(player);

  console.log(`[BetProcessor] Processing bet for ${player.username}: requestedBet=${chipCount}, availableChips=${availableChips}`);

  // Determine actual bet amount (may be less if all-in)
  const actualChipCount = Math.min(chipCount, availableChips);
  const wentAllIn = actualChipCount === availableChips && availableChips > 0;

  console.log(`[BetProcessor] Bet calculation: actualChipCount=${actualChipCount}, wentAllIn=${wentAllIn}`);

  // Remove chips from player BY VALUE (not by element count)
  // This handles chips with different denominations correctly
  const chipsToRemove = removeChipsByValue(player.chips, actualChipCount);
  const chipsRemaining = player.chips.length;
  const chipsRemainingValue = getChipTotal(player.chips);

  console.log(`[BetProcessor] Chips after bet - removed: ${chipsToRemove.length} elements (value: ${getChipTotal(chipsToRemove)}), remaining: ${chipsRemaining} elements (value: ${chipsRemainingValue})`);

  // Mark player as all-in if they bet all their chips
  if (wentAllIn) {
    player.isAllIn = true;
    player.allInAmount = actualChipCount;
    console.log(`[BetProcessor] Player ${player.username} marked as ALL-IN: isAllIn=${player.isAllIn}, allInAmount=${actualChipCount}`);
  } else {
    console.log(`[BetProcessor] Player ${player.username} NOT all-in: wentAllIn=${wentAllIn}, actualChipCount=${actualChipCount}, availableChips=${availableChips}, chipsRemainingValue=${chipsRemainingValue}`);
  }

  return {
    player,
    chipsToAdd: {
      player: player.username,
      chips: chipsToRemove,
    },
    actualChipCount,
    wentAllIn,
  };
}

/**
 * Update game state after a bet is placed
 * @param actualChipCount - The actual number of chips bet (may differ from requested if all-in)
 */
export function updateGameAfterBet(
  game: any,
  playerIndex: number,
  chipCount: number,
  updatedPlayer: Player,
  betToAdd: Bet,
  actualChipCount?: number
): void {
  // Use actualChipCount if provided (for all-in scenarios), otherwise use chipCount
  const chipsActuallyBet = actualChipCount !== undefined ? actualChipCount : chipCount;

  // Only add chips to pot if chipCount > 0 (skip for check action)
  if (chipsActuallyBet > 0) {
    game.pot.push(betToAdd);
    game.markModified('pot');
  }

  // Update player's total bet for this round
  game.playerBets[playerIndex] += chipsActuallyBet;
  game.markModified('playerBets');

  // Update player in game (even if chips didn't change, mark as modified for Mongoose)
  game.players[playerIndex] = updatedPlayer;
  game.markModified('players');

  const chipValue = getChipTotal(updatedPlayer.chips);
  console.log(`[updateGameAfterBet] Player ${updatedPlayer.username} updated in game - chips: ${updatedPlayer.chips.length} elements (value: ${chipValue}), isAllIn: ${updatedPlayer.isAllIn}`);

  // Move to next player (skip all-in and folded players)
  const startingIndex = playerIndex;
  let nextIndex = (playerIndex + 1) % game.players.length;
  let foundValidPlayer = false;

  console.log(`[updateGameAfterBet] Looking for next player after index ${startingIndex}`);

  // Find next active player (not all-in and not folded)
  let attempts = 0;
  while (attempts < game.players.length) {
    const candidate = game.players[nextIndex];
    console.log(`[updateGameAfterBet] Checking player ${nextIndex} (${candidate.username}): isAllIn=${candidate.isAllIn}, folded=${candidate.folded}`);

    if (!candidate.isAllIn && !candidate.folded) {
      foundValidPlayer = true;
      console.log(`[updateGameAfterBet] Found valid player at index ${nextIndex} (${candidate.username})`);
      break; // Found an active player
    }
    nextIndex = (nextIndex + 1) % game.players.length;
    attempts++;
  }

  // Only update currentPlayerIndex if we found a valid player
  if (foundValidPlayer) {
    const prevIndex = game.currentPlayerIndex;
    game.currentPlayerIndex = nextIndex;
    game.markModified('currentPlayerIndex');
    console.log(`[updateGameAfterBet] Advanced turn from index ${prevIndex} to ${nextIndex} (${game.players[nextIndex].username})`);
  } else {
    // All players are all-in or folded - don't advance turn
    console.log('[updateGameAfterBet] All players all-in/folded, skipping turn update');
  }
}

/**
 * Calculate next player index
 */
export function getNextPlayerIndex(currentIndex: number, totalPlayers: number): number {
  return (currentIndex + 1) % totalPlayers;
}
