// app/api/poker/lock/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { serializeGame } from '@/app/lib/utils/game-serialization';
import { initializeBets } from '@/app/poker/lib/utils/betting-helpers';
import { ActionHistoryType } from '@/app/poker/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRetry } from '@/app/lib/utils/retry';
import { placeSmallBlind, placeBigBlind } from '@/app/poker/lib/server/blinds-manager';
import { startActionTimer } from '@/app/poker/lib/server/poker-timer-controller';
import { GameActionType } from '@/app/poker/lib/definitions/game-actions';
import { POKER_TIMERS } from '@/app/poker/lib/config/poker-constants';
import { dealPlayerCards } from '@/app/poker/lib/server/poker-dealer';

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

        // Initialize dealer button position if not set (first hand starts at position 0)
        if (game.dealerButtonPosition === undefined) {
          game.dealerButtonPosition = 0;
          game.markModified('dealerButtonPosition');
        }

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

        // Validate players have enough chips before placing blinds
        const { getBlindConfig } = await import('@/app/poker/lib/server/blinds-manager');
        const { smallBlind, bigBlind } = getBlindConfig();

        // Calculate which players will post blinds based on button position
        const buttonPosition = game.dealerButtonPosition || 0;
        const smallBlindPos = game.players.length === 2 ? buttonPosition : (buttonPosition + 1) % game.players.length;
        const bigBlindPos = (buttonPosition + 1) % game.players.length;

        const smallBlindPlayerChips = game.players[smallBlindPos]?.chips?.length || 0;
        const bigBlindPlayerChips = game.players[bigBlindPos]?.chips?.length || 0;

        if (smallBlindPlayerChips < smallBlind || bigBlindPlayerChips < bigBlind) {
          // At least one player doesn't have enough chips - can't lock
          console.error(`[Force Lock] Insufficient chips - SB Player ${smallBlindPos}: ${smallBlindPlayerChips}/${smallBlind}, BB Player ${bigBlindPos}: ${bigBlindPlayerChips}/${bigBlind}`);

          // Unlock game and release lock
          game.locked = false;
          game.processing = false;
          await game.save();

          throw new Error(`Cannot start game - players do not have enough chips for blinds`);
        }

        // PLACE SMALL BLIND automatically without notification
        const smallBlindInfo = placeSmallBlind(game);
        console.log(`[Game Lock] Small blind posted by ${smallBlindInfo.player.username}: ${smallBlindInfo.amount} chips`);

        // PLACE BIG BLIND automatically without notification
        const bigBlindInfo = placeBigBlind(game);
        console.log(`[Game Lock] Big blind posted by ${bigBlindInfo.player.username}: ${bigBlindInfo.amount} chips`);

        // DEAL HOLE CARDS automatically after blinds (no notification)
        dealPlayerCards(game.deck, game.players, 2);
        game.markModified('deck');
        game.markModified('players');

        // Add action history for dealing hole cards
        game.actionHistory.push({
          id: randomBytes(8).toString('hex'),
          timestamp: new Date(),
          stage: 0, // Preflop
          actionType: ActionHistoryType.CARDS_DEALT,
          cardsDealt: 2,
        });
        game.markModified('actionHistory');

        console.log(`[Game Lock] Hole cards dealt to all players`);

        await game.save();

        // Emit game locked event to all clients with blinds and cards already dealt
        await PokerSocketEmitter.emitGameLocked({
          locked: true,
          stage: game.stage,
          players: game.players,
          currentPlayerIndex: game.currentPlayerIndex,
          lockTime: undefined, // Cleared
          pot: game.pot,
          playerBets: game.playerBets,
          actionHistory: game.actionHistory,
        });

        // Auto-start action timer for the current player (after blinds and cards dealt)
        // Timer starts for both human and AI players - AI will act quickly and cancel timer
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer) {
          await startActionTimer(
            id,
            POKER_TIMERS.ACTION_DURATION_SECONDS,
            GameActionType.PLAYER_BET,
            currentPlayer.id
          );

          // If current player is AI, trigger action immediately after timer starts
          // AI will act quickly and timer will be cancelled by the action
          if (currentPlayer.isAI) {
            console.log('[Game Lock] Timer started for AI player - triggering immediate action');
            const { executeAIActionIfReady } = await import('@/app/poker/lib/server/ai-player-manager');
            // Don't await - let it run asynchronously so response returns quickly
            executeAIActionIfReady(id).catch(error => {
              console.error('[Game Lock] AI action failed:', error);
            });
          }
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
