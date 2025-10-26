// app/lib/server/poker/game-lock-manager.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import type { Player } from '@/app/lib/definitions/poker';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import { initializeBets } from '@/app/lib/utils/betting-helpers';
import { ActionHistoryType } from '@/app/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { withRetry } from '@/app/lib/utils/retry';

/**
 * Initialize game when it's locked (2+ players ready to play)
 * Uses distributed locking to prevent race conditions with manual "Start Now" clicks
 */
async function initializeGameAtLock(gameId: string): Promise<void> {
  try {
    await withRetry(async () => {
      console.log('[Auto Lock] Attempting to acquire lock...');

      // ATOMIC LOCK ACQUISITION
      const lockResult = await PokerGame.findOneAndUpdate(
        { _id: gameId, processing: false },
        { processing: true },
        { new: false, lean: true }
      );

      if (!lockResult) {
        const existingGame = await PokerGame.findById(gameId).lean();
        if (!existingGame) {
          console.log('[Auto Lock] Game not found, aborting');
          return; // Game was deleted
        }
        console.log('[Auto Lock] Game is currently being processed, will retry...');
        throw new Error('Game is currently being processed');
      }

      console.log('[Auto Lock] Lock acquired! Fetching game state...');

      // Small delay to ensure write propagation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Fetch fresh document for processing
      const gameToLock = await PokerGame.findById(gameId);
      if (!gameToLock) {
        console.log('[Auto Lock] Game not found after lock acquisition');
        return;
      }

      try {
        // Check if game is already locked - if so, operation already succeeded (idempotent)
        if (gameToLock.locked) {
          console.log('[Auto Lock] Game already locked, skipping (idempotent)');
          gameToLock.processing = false;
          await gameToLock.save();
          return;
        }

        gameToLock.locked = true;
        gameToLock.lockTime = undefined; // Clear lock time since we're locking now
        gameToLock.stage = 0; // Preflop
        gameToLock.playerBets = initializeBets(gameToLock.players.length);
        gameToLock.currentPlayerIndex = 0;

        // Players start with empty hands - cards will be dealt after first blind betting round
        console.log('[Auto Lock] Game locked - blind betting begins (no cards dealt yet)');

        // Add action history directly to document (avoid separate save)
        gameToLock.actionHistory.push({
          id: randomBytes(8).toString('hex'),
          timestamp: new Date(),
          stage: 0, // Preflop
          actionType: ActionHistoryType.GAME_STARTED,
        });
        gameToLock.markModified('actionHistory');

        // Release lock before save
        gameToLock.processing = false;
        await gameToLock.save();

        console.log('[Auto Lock] Lock released, game locked successfully');

        // Emit granular game locked event to all clients
        const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
        const gameState = gameToLock.toObject();
        await PokerSocketEmitter.emitGameLocked({
          locked: true,
          stage: gameToLock.stage,
          players: gameToLock.players,
          currentPlayerIndex: gameToLock.currentPlayerIndex,
          lockTime: undefined, // Cleared
        });

        // Timer must be started manually via /api/poker/timer/start
        // Auto-start disabled per user request
      } catch (error) {
        // Release lock on error
        console.log('[Auto Lock] Error occurred, releasing lock...');
        try {
          await PokerGame.findByIdAndUpdate(gameId, { processing: false });
          console.log('[Auto Lock] Lock released successfully after error');
        } catch (unlockError) {
          console.error('[Auto Lock] Failed to release lock:', unlockError);
        }
        throw error;
      }
    }, {
      maxRetries: 8,
      baseDelay: 50,
      isRetryable: (error: any) => {
        return error.message?.includes('No matching document found') ||
               error.message?.includes('version') ||
               error.name === 'VersionError' ||
               error.message?.includes('currently being processed');
      }
    });
  } catch (error) {
    console.error('[Auto Lock] Error auto-locking game:', error);
  }
}

/**
 * Schedule auto-lock when second player joins
 * Game will lock after 10 seconds to allow more players to join
 */
export function scheduleGameLock(gameId: string, lockTime: Date): void {
  const delay = lockTime.getTime() - Date.now();

  setTimeout(async () => {
    await initializeGameAtLock(gameId);
  }, delay);
}

/**
 * Check if game should start lock timer (2 players joined)
 */
export function shouldStartLockTimer(playerCount: number, hasLockTime: boolean): boolean {
  return playerCount === 2 && !hasLockTime;
}
