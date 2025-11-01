// app/api/poker/lock/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { PokerGame } from '@/app/lib/models/poker-game';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { initializeBets } from '@/app/lib/utils/betting-helpers';
import { ActionHistoryType } from '@/app/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRetry } from '@/app/lib/utils/retry';
import { placeAutomaticBlinds } from '@/app/lib/server/poker/blinds-manager';
import { startActionTimer } from '@/app/lib/server/poker/poker-timer-controller';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import { POKER_TIMERS } from '@/app/lib/config/poker-constants';

export const POST = withAuth(async (request, context, session) => {
  const { gameId } = await request.json();
  const id = gameId || process.env.DEFAULT_GAME_ID!;

  try {
    const result = await withRetry(async () => {
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
        throw new Error('Game is currently being processed');
      }

      // Small delay to ensure write propagation (eventual consistency)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Fetch fresh document for processing
      const game = await PokerGame.findById(id);
      if (!game) throw new Error('Game not found after lock acquisition');

      try {
        // Check if game is already locked - if so, return success (idempotent operation)
        if (game.locked) {
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

        // Place automatic blind bets
        const blindInfo = placeAutomaticBlinds(game);

        // Release lock before save to prevent lock timeout issues
        game.processing = false;
        await game.save();

        // Emit game locked event to all clients
        const gameState = game.toObject();
        await PokerSocketEmitter.emitGameLocked({
          locked: true,
          stage: game.stage,
          players: game.players,
          currentPlayerIndex: game.currentPlayerIndex,
          lockTime: undefined, // Cleared
          pot: game.pot, // Include pot with blinds
          playerBets: game.playerBets, // Include player bets with blinds
          actionHistory: game.actionHistory, // Include action history with blind bets
        });

        // Emit blind notifications with delays
        await PokerSocketEmitter.emitGameNotification({
          message: `${blindInfo.smallBlindPlayer.username} posts small blind (${blindInfo.smallBlind} chip)`,
          type: 'blind',
          duration: 2000,
        });

        await new Promise(resolve => setTimeout(resolve, 2200));

        await PokerSocketEmitter.emitGameNotification({
          message: `${blindInfo.bigBlindPlayer.username} posts big blind (${blindInfo.bigBlind} chips)`,
          type: 'blind',
          duration: 2000,
        });

        await new Promise(resolve => setTimeout(resolve, 2200));

        // Auto-start action timer for the current player (after blinds)
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer) {
          await startActionTimer(
            id,
            POKER_TIMERS.ACTION_DURATION_SECONDS,
            GameActionType.PLAYER_BET,
            currentPlayer.id
          );
        }

        return {
          success: true,
          game: serializeGame(game),
          message: 'Game locked and started'
        };
      } catch (error) {
        // Release lock on error using atomic update (bypasses version check)
        try {
          await PokerGame.findByIdAndUpdate(id, { processing: false });
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
