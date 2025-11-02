// app/lib/utils/player-helpers.ts

import type { Player } from '@/app/poker/lib/definitions/poker';

/**
 * Find a player by their ID
 * @param players - Array of players
 * @param id - Player ID to search for
 * @returns Tuple of [player, index] or [undefined, -1] if not found
 */
export function findPlayerById(players: Player[], id: string): [Player | undefined, number] {
  const index = players.findIndex((p) => p.id === id);
  return index === -1 ? [undefined, -1] : [players[index], index];
}

/**
 * Find a player by their username
 * @param players - Array of players
 * @param username - Username to search for
 * @returns Player object or undefined if not found
 */
export function findPlayerByUsername(players: Player[], username: string): Player | undefined {
  return players.find((p) => p.username === username);
}

/**
 * Find the first player whose ID does NOT match the given ID
 * @param players - Array of players
 * @param excludeId - Player ID to exclude
 * @returns Tuple of [player, index] or [undefined, -1] if not found
 */
export function findOtherPlayer(players: Player[], excludeId: string): [Player | undefined, number] {
  const index = players.findIndex((p) => p.id !== excludeId);
  return index === -1 ? [undefined, -1] : [players[index], index];
}

/**
 * Get all active player usernames
 * @param players - Array of players
 * @returns Array of usernames
 */
export function getActivePlayerUsernames(players: Player[]): string[] {
  return players.map((p) => p.username);
}

/**
 * Validate that a player exists in the game
 * @param players - Array of players
 * @param playerId - Player ID to validate
 * @throws Error if player not found
 * @returns Player index
 */
export function validatePlayerExists(players: Player[], playerId: string): number {
  const index = players.findIndex((p) => p.id === playerId);
  if (index === -1) {
    throw new Error(`Player with ID ${playerId} not found in game`);
  }
  return index;
}
