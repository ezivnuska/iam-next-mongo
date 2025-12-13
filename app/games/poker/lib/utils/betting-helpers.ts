// app/lib/utils/betting-helpers.ts

/**
 * Initialize an array of player bets set to zero
 * @param playerCount - Number of players in the game
 * @returns Array of zeros with length equal to playerCount
 */
export function initializeBets(playerCount: number): number[] {
  return new Array(playerCount).fill(0);
}

/**
 * Calculate how much the current player needs to bet to call
 * @param playerBets - Array of bet amounts from each player
 * @param currentPlayerIndex - Index of the current player
 * @param players - Optional array of players to check for all-in scenarios
 * @returns The amount current player needs to add to match highest bet
 */
export function calculateCurrentBet(
  playerBets: number[],
  currentPlayerIndex: number,
  players?: Array<{ isAllIn?: boolean }>
): number {
  if (playerBets.length === 0) return 0;

  let maxBet = Math.max(...playerBets);
  const currentPlayerBet = playerBets[currentPlayerIndex] || 0;

  // In heads-up (2 players), if opponent is all-in, cap the bet at their total bet
  if (players && players.length === 2) {
    const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
    const opponent = players[opponentIndex];
    const opponentBet = playerBets[opponentIndex] || 0;

    if (opponent?.isAllIn) {
      // In heads-up, when opponent is all-in, you can only match their total bet
      maxBet = Math.min(maxBet, opponentBet);
    }
  }

  return Math.max(0, maxBet - currentPlayerBet);
}
