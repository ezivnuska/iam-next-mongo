// app/api/poker/lock/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { PokerGame } from '@/app/lib/models/poker-game';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { initializeBets } from '@/app/lib/utils/betting-helpers';
import { ActionHistoryType } from '@/app/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRetry } from '@/app/lib/utils/retry';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  try {
    const result = await withRetry(async () => {
      console.log('[Force Lock API] Attempting to acquire lock...');

      // ATOMIC LOCK ACQUISITION
      // Don't use the returned document - just check if lock was acquired
      const lockResult = await PokerGame.findOneAndUpdate(
        { _id: id, processing: false },
        { processing: true },
        { new: false, lean: true } // Return plain object, don't track
      );

      if (!lockResult) {
        // Either game doesn't exist OR another operation is in progress
        const existingGame = await PokerGame.findById(id).lean();
        if (!existingGame) {
          throw new Error('Game not found');
        }

        // Game is currently being processed by another operation
        console.log('[Force Lock API] Game is currently being processed, will retry...');
        throw new Error('Game is currently being processed');
      }

      console.log('[Force Lock API] Lock acquired! Fetching game state...');

      // Small delay to ensure write propagation (eventual consistency)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Fetch fresh document for processing
      const game = await PokerGame.findById(id);
      if (!game) throw new Error('Game not found after lock acquisition');

      console.log('[Force Lock API] Got game state', {
        version: game.__v,
        processing: game.processing
      });

      try {
        // Check if game is already locked - if so, return success (idempotent operation)
        if (game.locked) {
          console.log('[Force Lock API] Game already locked, returning success (idempotent)');
          game.processing = false; // Release lock
          await game.save();

          return {
            success: true,
            game: serializeGame(game),
            message: 'Game already locked'
          };
        }

        // Check if there are at least 2 players
        if (game.players.length < 2) {
          throw new Error('Need at least 2 players to start game');
        }

        console.log('[Force Lock API] Locking game immediately with', game.players.length, 'players');

        // Clear the lockTime and lock the game
        game.lockTime = undefined;
        game.locked = true;
        game.stage = 0; // Preflop
        game.playerBets = initializeBets(game.players.length);
        game.currentPlayerIndex = 0;

        // Add action history
        game.actionHistory.push({
          id: randomBytes(8).toString('hex'),
          timestamp: new Date(),
          stage: 0, // Preflop
          actionType: ActionHistoryType.GAME_STARTED,
        });
        game.markModified('actionHistory');

        // Release lock before save to prevent lock timeout issues
        game.processing = false;
        await game.save();

        console.log('[Force Lock API] Lock released, game locked successfully');

        // Emit game locked event to all clients
        const gameState = game.toObject();
        await PokerSocketEmitter.emitGameLocked({
          locked: true,
          stage: game.stage,
          players: game.players,
          currentPlayerIndex: game.currentPlayerIndex,
          lockTime: undefined, // Cleared
        });

        return {
          success: true,
          game: serializeGame(game),
          message: 'Game locked and started'
        };
      } catch (error) {
        // Release lock on error using atomic update (bypasses version check)
        console.log('[Force Lock API] Error occurred, releasing lock...');
        try {
          await PokerGame.findByIdAndUpdate(id, { processing: false });
          console.log('[Force Lock API] Lock released successfully after error');
        } catch (unlockError) {
          console.error('[Force Lock API] Failed to release lock:', unlockError);
        }
        throw error;
      }
    }, {
      maxRetries: 8,
      baseDelay: 50,
      isRetryable: (error: any) => {
        // Retry on version conflicts OR when game is being processed
        return error.message?.includes('No matching document found') ||
               error.message?.includes('version') ||
               error.name === 'VersionError' ||
               error.message?.includes('currently being processed');
      }
    });

    return Response.json(result);
  } catch (error) {
    console.error('[Force Lock API] Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to lock game' },
      { status: 500 }
    );
  }
});
