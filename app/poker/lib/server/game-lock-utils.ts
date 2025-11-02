// app/lib/server/poker/game-lock-utils.ts

import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { POKER_TIMERS } from '@/app/poker/lib/config/poker-constants';

/**
 * Acquire an atomic lock on a game to prevent concurrent modifications
 * Uses optimistic locking pattern with processing flag
 *
 * @throws Error if game not found or already being processed
 */
export async function acquireGameLock(gameId: string): Promise<any> {
  // ATOMIC LOCK ACQUISITION
  const lockResult = await PokerGame.findOneAndUpdate(
    { _id: gameId, processing: false },
    { processing: true },
    { new: false, lean: true }
  );

  if (!lockResult) {
    const existingGame = await PokerGame.findById(gameId).lean();
    if (!existingGame) {
      throw new Error('Game not found');
    }
    throw new Error('Game is currently being processed');
  }

  // Small delay to ensure write propagation
  await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.LOCK_ACQUISITION_DELAY_MS));

  // Fetch fresh document for processing
  const game = await PokerGame.findById(gameId);
  if (!game) {
    throw new Error('Game not found after lock acquisition');
  }

  return game;
}

/**
 * Release a game lock by setting processing flag to false
 * Handles errors gracefully with logging
 */
export async function releaseGameLock(gameId: string): Promise<void> {
  try {
    await PokerGame.findByIdAndUpdate(gameId, { processing: false });
  } catch (unlockError) {
    console.error('[Game Lock] Failed to release lock:', unlockError);
  }
}

/**
 * Execute a game operation with automatic lock acquisition and release
 * Handles lock lifecycle and error recovery
 *
 * @param gameId - Game to lock
 * @param operation - Async function to execute while holding the lock
 * @returns Result of the operation
 */
export async function withGameLock<T>(
  gameId: string,
  operation: (game: any) => Promise<T>
): Promise<T> {
  const game = await acquireGameLock(gameId);

  try {
    return await operation(game);
  } catch (error) {
    // Release lock on error
    await releaseGameLock(gameId);
    throw error;
  }
}
