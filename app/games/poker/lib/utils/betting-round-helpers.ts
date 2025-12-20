// app/games/poker/lib/utils/betting-round-helpers.ts

/**
 * Betting Round Helper Functions
 * Utilities for calculating turn order and betting round logic
 */

/**
 * Helper function to calculate the first player to act for current betting round
 * Works for both pre-flop and post-flop stages
 * Skips folded and all-in players to find first active player
 */
export function calculateFirstToActForBettingRound(game: any): number {
  const buttonPosition = game.dealerButtonPosition || 0;
  const isHeadsUp = game.players.length === 2;

  let firstToAct: number;

  if (game.stage === 0) {
    // Pre-flop: First to act is different
    // Heads-up: Small blind (button) acts first
    // 3+: UTG (player after big blind) acts first
    const bigBlindPos = isHeadsUp
      ? (buttonPosition + 1) % game.players.length
      : (buttonPosition + 2) % game.players.length;

    firstToAct = isHeadsUp
      ? buttonPosition  // Heads-up: button (SB) acts first
      : (bigBlindPos + 1) % game.players.length;  // 3+: UTG (after BB)
  } else {
    // Post-flop: Small blind acts first (or first active player after SB)
    const smallBlindPos = isHeadsUp
      ? buttonPosition
      : (buttonPosition + 1) % game.players.length;

    firstToAct = smallBlindPos;
  }

  // Find first active player starting from firstToAct position
  // Skip any players who are folded or all-in
  let attempts = 0;
  let currentIndex = firstToAct;

  while (attempts < game.players.length) {
    const candidate = game.players[currentIndex];
    if (!candidate.isAllIn && !candidate.folded) {
      break; // Found an active player
    }
    currentIndex = (currentIndex + 1) % game.players.length;
    attempts++;
  }

  return currentIndex;
}
