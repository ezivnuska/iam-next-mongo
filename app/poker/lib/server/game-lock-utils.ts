// app/lib/server/poker/game-lock-utils.ts

import { PokerGame, type PokerGameDocument } from '@/app/poker/lib/models/poker-game';
import { POKER_TIMERS } from '@/app/poker/lib/config/poker-constants';

/**
 * Acquire an atomic lock on a game to prevent concurrent modifications
 * Uses optimistic locking pattern with processing flag and timestamp
 * Auto-releases stale locks older than 10 seconds
 *
 * @throws Error if game not found or already being processed by recent operation
 */
export async function acquireGameLock(gameId: string): Promise<any> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - POKER_TIMERS.GAME_LOCK_TIMEOUT_MS);

  // Try to acquire lock (either processing=false OR processing timestamp is old/stale)
  const lockResult = await PokerGame.findOneAndUpdate(
    {
      _id: gameId,
      $or: [
        { processing: false },
        { processing: true, processingStartedAt: { $lt: lockExpiry } },
        { processing: true, processingStartedAt: null } // Handle old docs without timestamp
      ]
    },
    {
      processing: true,
      processingStartedAt: now
    },
    { new: false, lean: true }
  );

  if (!lockResult) {
    const existingGame = await PokerGame.findById(gameId).lean();
    if (!existingGame) {
      throw new Error('Game not found');
    }

    // Check if lock is stale (for better error message)
    const lockAge = (existingGame as any).processingStartedAt
      ? now.getTime() - new Date((existingGame as any).processingStartedAt).getTime()
      : 0;

    console.warn(`[Game Lock] Failed to acquire lock for game ${gameId}, processing=${(existingGame as any).processing}, lock age=${lockAge}ms`);
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
  operation: (game: PokerGameDocument) => Promise<T>
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
