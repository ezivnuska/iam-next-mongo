// app/lib/server/poker/bet-processor.ts

import type { Player, Bet } from '@/app/poker/lib/definitions/poker';
import type { PokerGameDocument } from '@/app/poker/lib/models/poker-game';
import { initializeBets } from '@/app/poker/lib/utils/betting-helpers';
import { getPlayerChipCount } from '@/app/poker/lib/utils/side-pot-calculator';

/**
 * Initialize player bets array if not properly set
 */
export function ensurePlayerBetsInitialized(game: PokerGameDocument): void {
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

  // Remove chips from player (simple subtraction now)
  player.chipCount -= actualChipCount;

  console.log(`[BetProcessor] Chips after bet - removed: ${actualChipCount}, remaining: ${player.chipCount}`);

  // Mark player as all-in if they bet all their chips
  if (wentAllIn) {
    player.isAllIn = true;
    player.allInAmount = actualChipCount;
    console.log(`[BetProcessor] Player ${player.username} marked as ALL-IN: isAllIn=${player.isAllIn}, allInAmount=${actualChipCount}`);
  } else {
    console.log(`[BetProcessor] Player ${player.username} NOT all-in: wentAllIn=${wentAllIn}, actualChipCount=${actualChipCount}, availableChips=${availableChips}, chipsRemaining=${player.chipCount}`);
  }

  return {
    player,
    chipsToAdd: {
      player: player.username,
      chipCount: actualChipCount,
    },
    actualChipCount,
    wentAllIn,
  };
}

/**
 * Update game state after a bet is placed (WITHOUT advancing player)
 * Player advancement should only happen if betting continues
 * @param actualChipCount - The actual number of chips bet (may differ from requested if all-in)
 */
export function updateGameAfterBet(
  game: PokerGameDocument,
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

  console.log(`[updateGameAfterBet] Player ${updatedPlayer.username} updated in game - chipCount: ${updatedPlayer.chipCount}, isAllIn: ${updatedPlayer.isAllIn}`);
  console.log(`[updateGameAfterBet] Player advancement will happen only if betting continues`);
}

/**
 * Advance to next active player (skip all-in and folded players)
 * Should only be called when betting continues (not when round completes)
 */
export function advanceToNextPlayer(game: PokerGameDocument, currentPlayerIndex: number): void {
  const startingIndex = currentPlayerIndex;
  let nextIndex = (currentPlayerIndex + 1) % game.players.length;
  let foundValidPlayer = false;

  console.log(`[advanceToNextPlayer] Looking for next player after index ${startingIndex}`);

  // Find next active player (not all-in and not folded)
  let attempts = 0;
  while (attempts < game.players.length) {
    const candidate = game.players[nextIndex];
    console.log(`[advanceToNextPlayer] Checking player ${nextIndex} (${candidate.username}): isAllIn=${candidate.isAllIn}, folded=${candidate.folded}`);

    if (!candidate.isAllIn && !candidate.folded) {
      foundValidPlayer = true;
      console.log(`[advanceToNextPlayer] Found valid player at index ${nextIndex} (${candidate.username})`);
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
    console.log(`[advanceToNextPlayer] Advanced turn from index ${prevIndex} to ${nextIndex} (${game.players[nextIndex].username})`);
  } else {
    // All players are all-in or folded - don't advance turn
    console.log('[advanceToNextPlayer] All players all-in/folded, skipping turn update');
  }
}

/**
 * Calculate next player index
 */
export function getNextPlayerIndex(currentIndex: number, totalPlayers: number): number {
  return (currentIndex + 1) % totalPlayers;
}
