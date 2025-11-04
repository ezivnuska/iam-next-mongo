// app/poker/lib/utils/side-pot-calculator.ts

import type { Player, PotInfo } from '../definitions/poker';
import { getChipTotal } from './poker';

/**
 * Player contribution for pot calculation
 */
interface PlayerContribution {
  playerId: string;
  username: string;
  amount: number;
  isAllIn: boolean;
  isFolded: boolean;
}

/**
 * Calculate side pots when players go all-in
 *
 * Algorithm:
 * 1. Collect all player contributions (excluding folded players for eligibility)
 * 2. Sort all-in amounts from smallest to largest
 * 3. For each all-in level, create a pot with eligible players
 * 4. Remaining chips after all side pots go into final pot
 *
 * Example:
 * Player A: 100 chips (all-in)
 * Player B: 200 chips (all-in)
 * Player C: 500 chips
 *
 * Result:
 * Main Pot: 300 (100 × 3 players) → A, B, C eligible
 * Side Pot 1: 200 (100 × 2 players) → B, C eligible
 * Side Pot 2: 200 (200 × 1 player) → C only
 */
export function calculateSidePots(
  players: Player[],
  playerBets: number[]
): PotInfo[] {
  // Build player contributions array
  const contributions: PlayerContribution[] = players.map((player, index) => ({
    playerId: player.id,
    username: player.username,
    amount: playerBets[index] || 0,
    isAllIn: player.isAllIn || false,
    isFolded: player.folded || false,
  }));

  // Filter out players with zero contribution
  const activeContributions = contributions.filter(c => c.amount > 0);

  if (activeContributions.length === 0) {
    return [];
  }

  // If no all-ins, return single pot with all players
  const hasAllIn = activeContributions.some(c => c.isAllIn);
  if (!hasAllIn) {
    const totalPot = activeContributions.reduce((sum, c) => sum + c.amount, 0);
    const eligiblePlayers = activeContributions
      .filter(c => !c.isFolded)
      .map(c => c.playerId);

    const contributionMap: { [key: string]: number } = {};
    activeContributions.forEach(c => {
      contributionMap[c.playerId] = c.amount;
    });

    return [{
      amount: totalPot,
      eligiblePlayers,
      contributions: contributionMap,
    }];
  }

  // Sort contributions by amount (ascending)
  const sortedContributions = [...activeContributions].sort((a, b) => a.amount - b.amount);

  const pots: PotInfo[] = [];
  let remainingContributions = [...sortedContributions];
  let previousLevel = 0;

  // Find all unique all-in levels
  const allInLevels = sortedContributions
    .filter(c => c.isAllIn)
    .map(c => c.amount)
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => a - b);

  // Create a pot for each all-in level
  for (const allInLevel of allInLevels) {
    const potSize = allInLevel - previousLevel;

    if (potSize > 0) {
      // Calculate contributions for this pot level
      const potContributions: { [key: string]: number } = {};
      let potTotal = 0;

      remainingContributions.forEach(c => {
        const contribution = Math.min(c.amount - previousLevel, potSize);
        if (contribution > 0) {
          potContributions[c.playerId] = contribution;
          potTotal += contribution;
        }
      });

      // Eligible players are those who contributed and haven't folded
      const eligiblePlayers = remainingContributions
        .filter(c => c.amount >= allInLevel && !c.isFolded)
        .map(c => c.playerId);

      pots.push({
        amount: potTotal,
        eligiblePlayers,
        contributions: potContributions,
      });

      // Remove players who are at this all-in level
      remainingContributions = remainingContributions.filter(c => c.amount > allInLevel);
    }

    previousLevel = allInLevel;
  }

  // Handle remaining chips (final pot for non-all-in players)
  if (remainingContributions.length > 0) {
    const potContributions: { [key: string]: number } = {};
    let potTotal = 0;

    remainingContributions.forEach(c => {
      const contribution = c.amount - previousLevel;
      if (contribution > 0) {
        potContributions[c.playerId] = contribution;
        potTotal += contribution;
      }
    });

    // All remaining players are eligible (they have the most chips)
    const eligiblePlayers = remainingContributions
      .filter(c => !c.isFolded)
      .map(c => c.playerId);

    if (potTotal > 0) {
      pots.push({
        amount: potTotal,
        eligiblePlayers,
        contributions: potContributions,
      });
    }
  }

  return pots;
}

/**
 * Check if a player has enough chips to make a bet
 */
export function getPlayerChipCount(player: Player): number {
  return getChipTotal(player.chips);
}

/**
 * Determine if a player should go all-in based on available chips and required bet
 */
export function shouldGoAllIn(player: Player, requiredBet: number): boolean {
  const availableChips = getPlayerChipCount(player);
  return availableChips > 0 && availableChips < requiredBet;
}

/**
 * Calculate the maximum amount a player can bet (all their chips)
 */
export function getMaxBetAmount(player: Player): number {
  return getPlayerChipCount(player);
}

/**
 * Check if all active players are all-in (no more betting possible)
 */
export function areAllPlayersAllInOrFolded(players: Player[]): boolean {
  const activePlayers = players.filter(p => !p.folded);
  const playersWithChips = activePlayers.filter(p => getPlayerChipCount(p) > 0);

  // If 0 or 1 player has chips, no more betting
  return playersWithChips.length <= 1;
}

/**
 * Merge legacy pot structure into PotInfo format for backward compatibility
 */
export function convertLegacyPotToPotInfo(
  pot: any[],
  players: Player[]
): PotInfo {
  const totalAmount = pot.reduce((sum, bet) => {
    return sum + getChipTotal(bet.chips);
  }, 0);

  const contributions: { [key: string]: number } = {};
  pot.forEach(bet => {
    const player = players.find(p => p.username === bet.player);
    if (player) {
      const betAmount = getChipTotal(bet.chips);
      contributions[player.id] = (contributions[player.id] || 0) + betAmount;
    }
  });

  const eligiblePlayers = players
    .filter(p => !p.folded)
    .map(p => p.id);

  return {
    amount: totalAmount,
    eligiblePlayers,
    contributions,
  };
}
