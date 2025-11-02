// app/lib/utils/betting.ts

/**
 * Checks if all player bets are equal
 * @param bets - Array of bet amounts from players
 * @returns true if there are 2+ players and all bets are equal
 */
export function areAllBetsEqual(bets: number[]): boolean {
  // Must have at least 2 players
  if (bets.length < 2) {
    return false;
  }

  // All bets must be equal to the first bet
  const firstBet = bets[0];
  return bets.every(bet => bet === firstBet);
}

/**
 * Checks if all active players have equal contributions to the pot
 * @param pot - Array of all bets in the pot
 * @param activePlayers - Array of active player usernames
 * @returns true if all active players have contributed equally
 */
export function areAllPotContributionsEqual(
  pot: Array<{ player: string; chips: Array<{ value: number }> }>,
  activePlayers: string[]
): boolean {
  if (activePlayers.length < 2) {
    return false;
  }

  // Calculate each player's total contribution
  const playerContributions: Record<string, number> = {};

  pot.forEach((bet) => {
    const playerName = bet.player;
    const betValue = bet.chips.reduce((sum, chip) => sum + chip.value, 0);
    playerContributions[playerName] = (playerContributions[playerName] || 0) + betValue;
  });

  // Get contributions for active players only
  const activeContributions = activePlayers
    .map(name => playerContributions[name] || 0);

  // All active players must have equal contributions
  const firstContribution = activeContributions[0];
  return activeContributions.every(contribution => contribution === firstContribution);
}
