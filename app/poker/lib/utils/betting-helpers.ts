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
 * @returns The amount current player needs to add to match highest bet
 */
export function calculateCurrentBet(playerBets: number[], currentPlayerIndex: number): number {
  if (playerBets.length === 0) return 0;

  const maxBet = Math.max(...playerBets);
  const currentPlayerBet = playerBets[currentPlayerIndex] || 0;

  return Math.max(0, maxBet - currentPlayerBet);
}

/**
 * Check if a player needs to match the current bet
 * @param playerBet - The player's current bet amount
 * @param currentBet - The current highest bet
 * @returns True if player has not matched the current bet
 */
export function needsToMatch(playerBet: number, currentBet: number): boolean {
  return playerBet < currentBet;
}

/**
 * Calculate how many chips a player needs to call
 * @param playerBet - The player's current bet amount
 * @param currentBet - The current highest bet
 * @returns Number of chips needed to call
 */
export function calculateCallAmount(playerBet: number, currentBet: number): number {
  return Math.max(0, currentBet - playerBet);
}
