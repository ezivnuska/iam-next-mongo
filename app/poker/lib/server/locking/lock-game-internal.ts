// app/poker/lib/server/lock-game-internal.ts

import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { initializeBets } from '@/app/poker/lib/utils/betting-helpers';
import { ActionHistoryType } from '@/app/poker/lib/definitions/action-history';
import { randomBytes } from 'crypto';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRetry } from '@/app/lib/utils/retry';
import { startActionTimer } from '../timers/poker-timer-controller';
import { GameActionType } from '@/app/poker/lib/definitions/game-actions';
import { POKER_TIMERS } from '@/app/poker/lib/config/poker-constants';

/**
 * Internal lock function that can be called server-side without auth
 * Used by server-driven restart flow
 */
export async function lockGameInternal(gameId: string) {
  console.log('[lockGameInternal] Locking game:', gameId);

  return await withRetry(async () => {
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

    await new Promise(resolve => setTimeout(resolve, 10));

    const game = await PokerGame.findById(gameId);
    if (!game) throw new Error('Game not found after lock acquisition');

    try {
      // Check if game is already locked
      if (game.locked) {
        game.processing = false;
        await game.save();
        return { success: true, message: 'Game already locked' };
      }

      // Check if there are at least 2 players
      // Handle gracefully by releasing lock and returning early (player may have left during countdown)
      if (game.players.length < 2) {
        console.log(`[lockGameInternal] ABORTED - insufficient players (${game.players.length}). Releasing lock.`);
        game.processing = false;
        game.lockTime = undefined; // Clear lock time
        await game.save();

        // Emit state update to sync clients
        await PokerSocketEmitter.emitStateUpdate(game);

        return { success: false, message: 'Insufficient players to start game' };
      }

      // Lock the game
      game.lockTime = undefined;
      game.locked = true;
      game.stage = 0; // Preflop
      game.playerBets = initializeBets(game.players.length);

      if (game.dealerButtonPosition === undefined) {
        game.dealerButtonPosition = 0;
        game.markModified('dealerButtonPosition');
      }

      // Set starting player based on game size (calculated after button position is set)
      const buttonPosition = game.dealerButtonPosition || 0;
      const smallBlindPos = game.players.length === 2 ? buttonPosition : (buttonPosition + 1) % game.players.length;
      const bigBlindPos = (buttonPosition + 1) % game.players.length;

      // Heads-up: small blind (button) acts first pre-flop
      // 3+ players: player after big blind acts first pre-flop
      game.currentPlayerIndex = game.players.length === 2
        ? smallBlindPos
        : (bigBlindPos + 1) % game.players.length;

      game.actionHistory.push({
        id: randomBytes(8).toString('hex'),
        timestamp: new Date(),
        stage: 0,
        actionType: ActionHistoryType.GAME_STARTED,
      });
      game.markModified('actionHistory');

      game.processing = false;
      await game.save();

      // Validate chips before placing blinds
      const { getBlindConfig } = await import('../actions/blinds-manager');
      const { smallBlind, bigBlind } = getBlindConfig();

      // Blind positions already calculated above (smallBlindPos, bigBlindPos)

      const smallBlindPlayerChips = game.players[smallBlindPos]?.chipCount || 0;
      const bigBlindPlayerChips = game.players[bigBlindPos]?.chipCount || 0;

      if (smallBlindPlayerChips < smallBlind || bigBlindPlayerChips < bigBlind) {
        console.error(`[lockGameInternal] Insufficient chips - SB Player ${smallBlindPos}: ${smallBlindPlayerChips}/${smallBlind}, BB Player ${bigBlindPos}: ${bigBlindPlayerChips}/${bigBlind}`);
        game.locked = false;
        game.processing = false;
        await game.save();
        throw new Error(`Cannot start game - players do not have enough chips for blinds`);
      }

      // Emit game locked event
      // NOTE: pot and playerBets are intentionally omitted here as they're empty at lock time.
      // Blinds will be posted via step flow and synced via blind notifications + state updates.
      await PokerSocketEmitter.emitGameLocked({
        locked: true,
        stage: game.stage,
        players: game.players,
        currentPlayerIndex: game.currentPlayerIndex,
        lockTime: undefined,
        actionHistory: game.actionHistory,
      });

      console.log(`[lockGameInternal] Game locked - starting step-based flow`);

      // *** USE STEP-BASED FLOW (consistent with first game) ***
      // Start the step orchestrator which will handle the entire game flow:
      // 1. Post small blind
      // 2. Post big blind
      // 3. Deal hole cards
      // 4. Betting cycle
      // ... and all subsequent stages
      const { startStepFlow } = await import('../flow/step-orchestrator');
      await startStepFlow(gameId);

      console.log('[lockGameInternal] ✅ Game successfully locked and started');

      return { success: true, message: 'Game locked and started' };
    } catch (error) {
      try {
        await PokerGame.findByIdAndUpdate(gameId, { processing: false });
      } catch (unlockError) {
        console.error('[lockGameInternal] Failed to release lock:', unlockError);
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
}
