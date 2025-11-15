// app/api/poker/reset-game/route.ts

import { withAuth } from '@/app/lib/api/with-auth';
import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { GameStage } from '@/app/poker/lib/definitions/poker';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRetry } from '@/app/lib/utils/retry';

/**
 * Reset game for next round after winner determined
 * This endpoint is called by the client after the winner notification completes
 */
export const POST = withAuth(async (request, context, session) => {
  try {
    const { gameId } = await request.json();

    if (!gameId) {
      return Response.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    console.log(`[ResetGame API] ✅ Reset game called for: ${gameId}`);

    const result = await withRetry(async () => {
      // ATOMIC LOCK ACQUISITION to handle concurrent calls from multiple clients
      const lockResult = await PokerGame.findOneAndUpdate(
        { _id: gameId, processing: false },
        { processing: true },
        { new: false, lean: true }
      );

      if (!lockResult) {
        // Another client is already processing this - that's fine, let them handle it
        console.log(`[ResetGame API] Another client is already processing reset`);
        return { success: true, message: 'Reset already in progress' };
      }

      // Small delay to ensure write propagation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Fetch fresh document for processing
      const game = await PokerGame.findById(gameId);
      if (!game) {
        throw new Error('Game not found after lock acquisition');
      }

      try {
        // Check if game is already in End stage or beyond - if so, reset already happened
        if (game.stage === GameStage.End || game.stage === 0) {
          console.log(`[ResetGame API] Game already in End stage or reset, skipping`);
          game.processing = false;
          await game.save();
          return { success: true, message: 'Game already reset or in progress' };
        }

        // Advance to End stage
        game.stage = GameStage.End;
        game.markModified('stage');
        game.processing = false; // Release lock before save
        await game.save();

        console.log(`[ResetGame API] ✅ Advanced to End stage`);

        // OPTIMIZATION: Skip intermediate state update to reduce page refreshes
        // The End stage is just transitional - clients will get the reset state next
        // await PokerSocketEmitter.emitStateUpdate(game);

        // Trigger game reset/restart flow
        const { StageManager } = await import('@/app/poker/lib/server/stage-manager');
        await StageManager.resetGameForNextRound(game);

        console.log(`[ResetGame API] ✅ Game reset complete, restart notification emitted`);

        return { success: true, message: 'Game reset for next round' };
      } catch (error) {
        // Release lock on error
        try {
          await PokerGame.findByIdAndUpdate(gameId, { processing: false });
        } catch (unlockError) {
          console.error('[ResetGame API] Failed to release lock:', unlockError);
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

    return Response.json(result);
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to reset game';
    const errorStack = error?.stack || '';
    console.error('[ResetGame API] ❌ Error:', errorMessage);
    console.error('[ResetGame API] ❌ Stack:', errorStack);

    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
